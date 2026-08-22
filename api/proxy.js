export default async function handler(req, res) {
  try {
    // بناء URL بشكل آمن داخل Vercel
    const requestUrl = new URL(
      req.url,
      `https://${req.headers.host || "restream-tv.vercel.app"}`
    );

    let path = requestUrl.searchParams.get("path") || "/";

    // التأكد أن المسار يبدأ بـ /
    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    // إزالة path من Query
    requestUrl.searchParams.delete("path");

    const query = requestUrl.search;

    // السيرفر الأصلي
    const targetUrl =
      `http://olivia.hidencloud.com:24651${path}${query}`;

    console.log("Proxy Target:", targetUrl);

    const headers = new Headers();

    // نسخ Headers القادمة من العميل
    for (const [key, value] of Object.entries(req.headers)) {
      if (
        key.toLowerCase() !== "host" &&
        key.toLowerCase() !== "content-length"
      ) {
        headers.set(key, value);
      }
    }

    // السماح بـ CORS
    headers.set("X-Forwarded-Host", req.headers.host || "");

    const options = {
      method: req.method,
      headers,
      redirect: "follow"
    };

    // إرسال Body للطلبات التي تحتاجه
    if (
      req.method !== "GET" &&
      req.method !== "HEAD" &&
      req.method !== "OPTIONS" &&
      req.body
    ) {
      options.body = req.body;
    }

    // OPTIONS
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, HEAD, POST, OPTIONS"
      );
      res.setHeader("Access-Control-Allow-Headers", "*");
      return res.end();
    }

    // Proxy Request
    const response = await fetch(targetUrl, options);

    res.statusCode = response.status;

    // نسخ Headers من السيرفر الأصلي
    response.headers.forEach((value, key) => {
      const blockedHeaders = [
        "connection",
        "keep-alive",
        "transfer-encoding",
        "content-length"
      ];

      if (!blockedHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, HEAD, POST, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "*"
    );

    // لا يوجد Body
    if (!response.body) {
      return res.end();
    }

    // تمرير البيانات Streaming
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      res.write(Buffer.from(value));
    }

    res.end();

  } catch (error) {
    console.error("Proxy Error:", error);

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.end(
      JSON.stringify({
        error: "Proxy Error",
        message: error.message
      })
    );
  }
}
