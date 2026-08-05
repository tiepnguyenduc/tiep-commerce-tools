import "server-only";
export function checkoutRegion(apiUrl: string) {
  return apiUrl
    .replace(/^https?:\/\/api\./, "")
    .replace(/\.commercetools\.com\/?$/, "");
}
export async function createCheckoutSession(cartId: string) {
  const auth = Buffer.from(
    `${process.env.CTP_CLIENT_ID}:${process.env.CTP_CLIENT_SECRET}`,
  ).toString("base64");
  const tokenRes = await fetch(`${process.env.CTP_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: process.env.CTP_SCOPES!,
    }),
  });
  if (!tokenRes.ok) throw new Error(`OAuth failed (${tokenRes.status})`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const region = checkoutRegion(process.env.CTP_API_URL!);
  const res = await fetch(
    `https://session.${region}.commercetools.com/${process.env.CTP_PROJECT_KEY}/sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cart: { cartRef: { id: cartId } },
        metadata: { applicationKey: process.env.CTP_CHECKOUT_APP_KEY },
      }),
    },
  );
  if (!res.ok) throw new Error(`Session creation failed (${res.status})`);
  const data = (await res.json()) as { id: string };
  return {
    sessionId: data.id,
    projectKey: process.env.CTP_PROJECT_KEY!,
    region,
  };
}
