import OpenAI from "openai";
import readlineSync from "readline-sync";

 

const openai = new OpenAI({
    apiKey: OPEN_AI_API_KEY,
});


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

const prompt = "What is the weather in Delhi?";

async function chat(){

    const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT,

            },
            {
                role: "user",
                content: prompt,
            },
        ],
        max_tokens: 100,
    });

    console.log(result.choices[0].message.content);

}

chat();




