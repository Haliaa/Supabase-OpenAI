// import { Configuration, OpenAIApi } from "openai";
// import { supabase } from "../../services/supabaseClient";

// const openai = new OpenAIApi(
//   new Configuration({
//     apiKey: process.env.OPENAI_API_KEY,
//   })
// );

// export default async function handler(req, res) {
//   const { message, userId } = JSON.parse(req.body);

//   const completion = await openai.createChatCompletion({
//     model: "gpt-3.5-turbo",
//     messages: [{ role: "user", content: message }],
//   });

//   const result = completion.data.choices[0].message.content;

//   // Update request count
//   const { data: existing } = await supabase
//     .from("chat_requests")
//     .select("*")
//     .eq("user_id", userId)
//     .single();

//   if (existing) {
//     await supabase
//       .from("chat_requests")
//       .update({ request_count: existing.request_count + 1 })
//       .eq("user_id", userId);
//   } else {
//     await supabase
//       .from("chat_requests")
//       .insert({ user_id: userId, request_count: 1 });
//   }

//   res.status(200).json({ result });
// }
