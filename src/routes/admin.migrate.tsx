import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Database, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminLogout, useAdminSession } from "@/lib/admin-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/migrate")({
  head: () => ({ meta: [{ title: "Data Migration — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminMigrate,
});

type MigrationLog = {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error";
};

function AdminMigrate() {
  const navigate = useNavigate();
  const { isAuthenticated, ready } = useAdminSession();
  const [hasExistingData, setHasExistingData] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/admin/login" });
  }, [ready, isAuthenticated, navigate]);

  useEffect(() => {
    checkExistingData();
  }, []);

  const addLog = (message: string, type: MigrationLog["type"] = "info") => {
    setLogs((prev) => [...prev, { timestamp: new Date().toISOString(), message, type }]);
  };

  const checkExistingData = async () => {
    try {
      const { data: products } = await supabase.from('products').select('id').limit(1);
      const { data: shipping } = await supabase.from('shipping_rates').select('code').limit(1);
      setHasExistingData((products?.length ?? 0) > 0 || (shipping?.length ?? 0) > 0);
    } catch (error) {
      console.error('Error checking existing data:', error);
    }
  };

  const migrateProducts = async () => {
    addLog("Starting product migration...", "info");
    
    try {
      const productsKey = "nb_admin_products";
      const raw = localStorage.getItem(productsKey);
      if (!raw) {
        addLog("No products found in localStorage", "info");
        return;
      }

      const products = JSON.parse(raw);
      addLog(`Found ${products.length} products in localStorage`, "info");

      for (const product of products) {
        try {
          // Convert images from data URLs to Supabase Storage URLs if they are data URLs
          const images = await Promise.all(
            product.images.map(async (img: string) => {
              if (img.startsWith('data:')) {
                // Convert data URL to file and upload
                const response = await fetch(img);
                const blob = await response.blob();
                const file = new File([blob], `product-${Date.now()}.png`, { type: blob.type });
                
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
                const { data, error } = await supabase.storage
                  .from('product-images')
                  .upload(fileName, file);
                
                if (error) throw error;
                
                const { data: { publicUrl } } = supabase.storage
                  .from('product-images')
                  .getPublicUrl(fileName);
                
                return publicUrl;
              }
              return img;
            })
          );

          const { error } = await supabase.from('products').insert({
            name: product.name,
            description: product.description,
            short_description: product.shortDescription,
            price: product.price,
            stock: product.stock,
            rating: product.rating,
            images: images,
            enabled: true,
          });

          if (error) throw error;
          addLog(`Migrated product: ${product.name}`, "success");
        } catch (error) {
          addLog(`Failed to migrate product ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        }
      }

      addLog("Product migration completed", "success");
    } catch (error) {
      addLog(`Product migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
      throw error;
    }
  };

  const migrateShipping = async () => {
    addLog("Starting shipping rates migration...", "info");
    
    try {
      const shippingKey = "nb_admin_shipping";
      const raw = localStorage.getItem(shippingKey);
      if (!raw) {
        addLog("No shipping rates found in localStorage", "info");
        return;
      }

      const wilayas = JSON.parse(raw);
      addLog(`Found ${wilayas.length} wilayas in localStorage`, "info");

      for (const wilaya of wilayas) {
        try {
          const { error } = await supabase.from('shipping_rates').insert({
            code: wilaya.code,
            name: wilaya.name,
            home_rate: wilaya.rates.home,
            office_rate: wilaya.rates.office,
            enabled: wilaya.enabled,
          });

          if (error) throw error;
          addLog(`Migrated wilaya: ${wilaya.name}`, "success");
        } catch (error) {
          addLog(`Failed to migrate wilaya ${wilaya.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        }
      }

      addLog("Shipping rates migration completed", "success");
    } catch (error) {
      addLog(`Shipping rates migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
      throw error;
    }
  };

  const migrateOrders = async () => {
    addLog("Starting orders migration...", "info");
    
    try {
      const ordersKey = "nail-beauty-orders-v1";
      const raw = localStorage.getItem(ordersKey);
      if (!raw) {
        addLog("No orders found in localStorage", "info");
        return;
      }

      const orders = JSON.parse(raw);
      addLog(`Found ${orders.length} orders in localStorage`, "info");

      for (const order of orders) {
        try {
          // First create the order
          const { data: orderData, error: orderError } = await supabase.from('orders').insert({
            order_number: order.orderNumber,
            customer_name: order.customer.fullName,
            customer_phone: order.customer.phone,
            wilaya_code: order.delivery.wilayaCode,
            wilaya_name: order.delivery.wilayaName,
            delivery_method: order.delivery.method,
            address: order.delivery.address || null,
            office_location: order.delivery.officeLocation || null,
            subtotal: order.subtotal,
            shipping_fee: order.shippingFee,
            total: order.total,
            payment_method: order.paymentMethod,
            status: order.status || 'pending',
            notes: order.notes || null,
          }).select().single();

          if (orderError) throw orderError;

          // Then create order items
          for (const item of order.items) {
            const { error: itemError } = await supabase.from('order_items').insert({
              order_id: orderData.id,
              name: item.name,
              image: item.image || null,
              unit_price: item.unitPrice,
              quantity: item.quantity,
              line_total: item.lineTotal,
            });

            if (itemError) throw itemError;
          }

          addLog(`Migrated order: ${order.orderNumber}`, "success");
        } catch (error) {
          addLog(`Failed to migrate order ${order.orderNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        }
      }

      addLog("Orders migration completed", "success");
    } catch (error) {
      addLog(`Orders migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
      throw error;
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setLogs([]);
    setCompleted(false);

    try {
      await migrateProducts();
      await migrateShipping();
      await migrateOrders();
      
      setCompleted(true);
      addLog("Migration completed successfully!", "success");
      toast.success("Migration completed successfully!");
      
      // Refresh data check
      await checkExistingData();
    } catch (error) {
      addLog("Migration failed. Please check the logs above.", "error");
      toast.error("Migration failed. Please check the logs.");
    } finally {
      setMigrating(false);
    }
  };

  if (!ready || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (hasExistingData) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-[var(--shadow-soft)]">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 grid place-items-center text-emerald-600 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-display font-semibold mb-2">Data Already Migrated</h1>
            <p className="text-muted-foreground mb-6">
              Your data has already been migrated to Supabase. This migration tool is disabled to prevent duplicate data.
            </p>
            <Button onClick={() => navigate({ to: "/admin" })} className="rounded-xl">
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold mb-2">Data Migration</h1>
          <p className="text-muted-foreground">
            Migrate your existing localStorage data (products, shipping rates, orders) to Supabase.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Info Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/50 grid place-items-center text-primary flex-shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">What will be migrated?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Products (with images uploaded to Supabase Storage)</li>
                  <li>• Shipping rates (wilayas and delivery fees)</li>
                  <li>• Orders (with order items)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Migration Button */}
          {!completed && (
            <Button
              onClick={handleMigrate}
              disabled={migrating}
              className="rounded-xl w-full h-14 text-base"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Migrating data...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Start Migration
                </>
              )}
            </Button>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)]">
              <h3 className="font-semibold mb-4">Migration Log</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    {log.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />}
                    {log.type === "error" && <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />}
                    {log.type === "info" && <div className="w-4 h-4 rounded-full bg-muted mt-0.5 flex-shrink-0" />}
                    <span className={log.type === "error" ? "text-destructive" : ""}>
                      {log.message}
                    </span>
                    <span className="text-muted-foreground text-xs ml-auto">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completed && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-emerald-900">Migration Complete!</h3>
                  <p className="text-sm text-emerald-700">
                    Your data has been successfully migrated to Supabase.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate({ to: "/admin" })}
                className="mt-4 rounded-xl"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
