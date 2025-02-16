import OpenAI from "openai";
import readlineSync from "readline-sync";
// dot env
import dotenv from "dotenv";
dotenv.config();

const OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY;



const openai = new OpenAI({
    apiKey: OPEN_AI_API_KEY,
});


const tools = {
    getWeatherDetails: getWeather,
}


function getWeather(city = '') {
    if(city.toLowerCase() === 'ahmedabad') {
        return '10°C';
    } else if(city.toLowerCase() === 'mumbai') {
        return '20°C';
    }else if(city.toLowerCase() === 'delhi') {
        return '30°C';
    }else if(city.toLowerCase() === 'pune') {
        return '40°C';
    }else {
        return 'No data found';
    }
    
}

const SYSTEM_PROMPT = `
You are an AI Assistant with START,PLAN,ACTION, OBSERVATION and OUTPUT states
Wait for the user prompt and first PLAN using available tools.
After Planning, Take the action with appropriate tools and wait for Observation based on Action.
Once you get the observations, Return the AI response based on START prompt and observations

Strictly follow the JSON format as exampled below

Available Tools:
- function getWeatherDetails(city) {
getWeatherDetails is a function that takes a city as input and returns the weather of that city.


Example:
START
{ "type": "user", "user": "What is the sum of weather of Patiala and Mohali?" }
{ "type": "plan", "plan": "I will call the getWeatherDetails for Patiala" } 
{ "type": "action", "function": "getWeatherDetails", "input": "patiala" }
{ "type": "observation", "observation": "10°C" }
{ "type": "plan", "plan": "I will call getweatherDetails for Mohali" }
{ "type": "action", "function": "getWeatherDetails", "input": "mohali" }
{ "type": "observation", "observation": "14°C" }
{ "type": "output", "output": "The sum of weather of Patiala and Mohali is 24°C" }
`;

const messages = [{
    role: "system",
    content: SYSTEM_PROMPT,
}]


while (true){
    const query = readlineSync.question('>>: ');

    const q = {
        role: "user",
        content: query,
    }
    messages.push({role: "user", content: JSON.stringify(q)});

    while(true){
        const chat = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            response_format: { type: "json_object" },
            max_tokens: 100,
        });


        const result = chat.choices[0].message.content;
        messages.push({role: "assistant", content: result});

        console.log('\n\n\n --------------- Start ---------------');
        console.log(result);
        console.log('--------------- Ends ---------------\n\n\n ');



        const call = JSON.parse(result);

        if(call.type === 'output'){
            console.log(result);
            break;
        }else if(call.type === 'action'){
            const functionName = tools[call.function];
            const observation = functionName(call.input);
            const observationMessage = {type: "observation", observation: observation};
            messages.push({role: "developer", content: JSON.stringify(observationMessage)});

           
        }
    }
    
}


