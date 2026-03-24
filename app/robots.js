// app/robots.js
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/clip/", "/api/"],
      },
    ],
  };
}
