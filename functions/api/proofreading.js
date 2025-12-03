export async function onRequestPost(context){
  try{
    const {text}=await context.request.json();
    const FIXED_ID="296b169c20554de4ba9e0fe760be40da";

    const r=await fetch("https://gateway.ai-poly.com/text_hub/api/v2/grammar_check/gec",{
      method:"POST",
      headers:{
        "accept":"*/*",
        "content-type":"application/json",
        "x-auth-token":"TOKEN_HERE",
        "Referer":"https://frontwt.edu-poly.com/"
      },
      body:JSON.stringify({
        header:{call_message_id:FIXED_ID},
        payload:{text,raise_error:false}
      })
    });
    const data=await r.json();
    return new Response(JSON.stringify(data),{
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
    });
  }catch(e){
    return new Response(JSON.stringify({error:e.message}),{status:500});
  }
}
