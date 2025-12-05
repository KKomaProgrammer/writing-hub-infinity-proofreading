export async function onRequestPost(context) {
  try {
    const { text } = await context.request.json();

    const FIXED_ID = "296b169c20554de4ba9e0fe760be40da";

    const response = await fetch(
      "https://gateway.ai-poly.com/text_hub/api/v2/grammar_check/gec",
      {
        method: "POST",
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          "x-auth-token":
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhaXAtZ3ciLCJpYXQiOjE3NjQ5Mzg4MzIsImV4cCI6MTc2NTAyNTIzMiwic3ViIjoiMGI2YWQzNzYtNDk1Ny00OWM5LWFhZDMtNzY0OTU3NTljOWRjIn0.f5Fwsc1f2TXzS_XLDtMjMcgPpuGOiLDce8cnK_ru8Dg",
          Referer: "https://frontwt.edu-poly.com/"
        },
        body: JSON.stringify({
          header: { call_message_id: FIXED_ID },
          payload: { text, raise_error: false }
        })
      }
    );

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
