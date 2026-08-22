export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url);

    let path = requestUrl.searchParams.get("path") || "/";

    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    // إزالة path من الـ Query حتى لا يتم إرساله للسيرفر الأصلي
    requestUrl.searchParams.delete("path");

    const query = requestUrl.search;

    const targetUrl =
      `http://olivia.hidencloud.com:24651${path}${query}`;

    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== "host") {
        headers.set(key, value);
      }
    }

    const options = {
      method: req.method,
      headers,
      redirect: "follow"
    };

    if (
      req.method !== "GET" &&
      req.method !== "HEAD" &&
      req.method !== "OPTIONS" &&
      req.body
    ) {
      options.body = req.body;
    }

    const response = await fetch(targetUrl, options);

    res.statusCode = response.status;

    response.headers.forEach((value, key) => {
      if (
        ![
          "connection",
          "keep-alive",
          "transfer-encoding"
        ].includes(key.toLowerCase())
      ) {
        res.setHeader(key, value);
      }
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, HEAD, POST, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "*"
    );

    if (req.method === "OPTIONS") {
      return res.end();
    }

    if (!response.body) {
      return res.end();
    }

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      res.write(Buffer.from(value));
    }

    res.end();

  } catch (error) {
    console.error(error);

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");

    res.end(JSON.stringify({
      error: "Proxy Error",
      message: error.message
    }));
  }
}
