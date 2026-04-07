import http from "http";

const req = http.request("http://localhost:3000/api/create-checkout-session", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  }
}, (res) => {
  console.log("Status:", res.statusCode);
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    console.log("Response:", data.substring(0, 100));
  });
});

req.write(JSON.stringify({ userId: "123" }));
req.end();
