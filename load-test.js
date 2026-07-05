import http from "k6/http";

export const options = {
  vus: 600,
  duration: "30s",
};

export default function () {
  http.get("http://localhost:8080");
}