export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const text = body.text;

    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({ error: "payload.text must not be blank" }),
        { status: 400 }
      );
    }

    const response = await fetch("https://gateway.ai-poly.com/text_hub/api/v2/grammar_check/gec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-auth-token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhaXAtZ3ciLCJpYXQiOjE3NjUyNjAyMzMsImV4cCI6MTc2NTM0NjYzMywic3ViIjoiY2MyOGE2M2EtYmNkZC00ZjQzLWE4YTYtM2FiY2RkYmY0MzE0In0.c6sLvqDXEl-7ybXCh_xPxAZ1zm0G06aRo_tgxwiyUrY",
        "Referer": "https://frontwt.edu-poly.com/"
      },
      body: JSON.stringify({
        header: { call_message_id: "296b169c20554de4ba9e0fe760be40da" },
        payload: { text: text, raise_error: false }
      })
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500
    });
  }
}
