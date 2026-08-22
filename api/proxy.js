export default async function handler(req, res) {
  try {
    const targetUrl =
      `http://olivia.hidencloud.com:24651${req.url.replace(/^\/api\/proxy/, '')}`;

    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== "host") {
        headers.set(key, value);
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      redirect: "follow"
    });

    res.status(response.status);

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.setHeader("Access-Control-Allow-Origin", "*");

    const body = Buffer.from(await response.arrayBuffer());

    res.send(body);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Proxy error",
      message: error.message
    });
  }
}
