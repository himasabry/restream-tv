export default async function handler(req, res) {
  try {
    const url = new URL(req.url);

    // إزالة /api/proxy من المسار
    let pathname = url.pathname.replace(/^\/api\/proxy/, "");

    if (!pathname.startsWith("/")) {
      pathname = "/" + pathname;
    }

    // السيرفر الأصلي
    const targetUrl =
      `http://olivia.hidencloud.com:24651${pathname}${url.search}`;

    // نسخ Headers الطلب
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== "host") {
        headers.set(key, value);
      }
    }

    // طلب السيرفر الأصلي
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      redirect: "follow"
    });

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Range, User-Agent"
    );

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }

    res.statusCode = upstream.status;

    // نسخ Headers الاستجابة
    upstream.headers.forEach((value, key) => {
      const blocked = [
        "connection",
        "keep-alive",
        "transfer-encoding"
      ];

      if (!blocked.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Streaming
    if (!upstream.body) {
      return res.end();
    }

    const reader = upstream.body.getReader();

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

    res.end(
      JSON.stringify({
        error: "Proxy Error",
        message: error.message
      })
    );
  }
}
