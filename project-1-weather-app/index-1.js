import OpenAI from "openai";



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

const prompt = "What is the weather in Ahmedabad?";

openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
        {
            role: "user",
            content: prompt,
        },
    ],
    max_tokens: 100,
}).then((response) => {
    // console.log(response);

    const message = response.choices[0].message.content;
    console.log(message);
}).catch((error) => {
    console.error(error);
});