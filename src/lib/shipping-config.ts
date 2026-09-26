export type DeliveryMethod = "home" | "office";

export const DELIVERY_METHODS: Array<{
value: DeliveryMethod;
label: string;
description: string;
}> = [
{
value: "home",
label: "Home Delivery",
description: "Delivered to your door by courier.",
},
{
value: "office",
label: "DHD Office Pickup",
description: "Pick up your order from the nearest DHD office.",
},
];
