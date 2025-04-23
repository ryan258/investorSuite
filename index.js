import dotenv from 'dotenv'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import fs from 'fs'
import express from 'express'
import path from 'path'
import readline from 'readline'
import fetch from 'node-fetch'

// Load environment variables from .env file 
dotenv.config()

// Add Express
const app = express()
app.use(express.json()) // Add this line to parse JSON request bodies
const port = 3003 // You can choose any available port

// Define allScenariosData as a global variable
let allScenariosData = []

// API endpoint to serve scenario data
app.get('/api/scenarios', (req, res) => {
  // If no data has been generated, return a default scenario for accessibility/testing
  if (!allScenariosData || allScenariosData.length === 0) {
    return res.json([
      {
        scenario: {
          title: 'Sample AI Scenario',
          description: 'This is a sample scenario for accessibility and testing.',
        },
        items: [
          {
            item: 'Sample Step',
            eta: { eta: 'Within the next 5 years' },
            futureTimelines: {
              optimistic: 'Rapid adoption and positive change.',
              realistic: 'Gradual progress with some challenges.',
              pessimistic: 'Slow uptake and resistance.',
              wildcard: 'Unexpected breakthrough occurs.'
            },
            analogy: {
              event: 'Internet Adoption',
              similarity: 'Transformative technology with global impact.',
              lesson: 'Broad access and education are key.'
            },
            stakeholders: [
              { name: 'Developers', role: 'Builder', description: 'Create and maintain the technology.' },
              { name: 'Users', role: 'Beneficiary', description: 'Benefit from the solutions.' }
            ],
            innovation: {
              idea: 'AI-powered accessibility tools',
              potential: 'Empower people with disabilities worldwide.',
              challenges: 'Ensuring inclusivity and affordability.'
            }
          }
        ]
      }
    ])
  }
  res.json(allScenariosData)
})

// POST /api/scenarios - Generate scenario(s) based on a prompt
app.post('/api/scenarios', async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    console.log('Received prompt:', prompt);

    const useOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL;
    let timelineEvents = [];
    let markdownContent = '';

    // Updated prompt for more realistic, milestone-based, non-cookie-cutter timelines
    const nowYear = new Date().getFullYear();
    const endYear = nowYear + 10;
    const aiPrompt = `Generate a positive future scenario timeline for: ${prompt}. Limit the timespan to between ${nowYear} and ${endYear}. Include ALL foreseeable milestone events (not just generic intervals like 5, 10, or 15 years). Use realistic, plausible years and actual milestone dates if known. Do not invent artificial intervals. Respond ONLY as a single valid JSON array of 3 to 7 objects, each with these exact fields: title, date, description. Do not include markdown, code blocks, or extra commentary. Example: [{\"title\":\"...\",\"date\":\"${nowYear + 1}\",\"description\":\"...\"}, ...]`;

    if (useOpenAI) {
      // Use OpenAI API
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: aiPrompt }
          ],
          temperature: 0.7
        })
      });
      const openaiData = await openaiRes.json();
      const aiText = openaiData.choices?.[0]?.message?.content || '';
      // Try to extract JSON array from the AI output
      let jsonMatch = aiText.match(/\[.*\]/s);
      if (jsonMatch) {
        try {
          timelineEvents = JSON.parse(jsonMatch[0]);
        } catch (err) {
          console.error('Error parsing OpenAI scenario array JSON:', err);
        }
      }
      // Fallback: try to extract a single object
      if ((!timelineEvents || !timelineEvents.length) && aiText.includes('{')) {
        let singleJsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (singleJsonMatch) {
          try {
            timelineEvents = [JSON.parse(singleJsonMatch[0])];
          } catch (err) {
            console.error('Error parsing single scenario JSON from OpenAI:', err);
          }
        }
      }
      // Fallback: plain text
      if (!timelineEvents || !timelineEvents.length) {
        timelineEvents = [{
          title: `Scenario for: ${prompt}`,
          date: nowYear.toString(),
          description: aiText.trim() || 'No scenario returned.'
        }];
      }
      // Save markdown
      markdownContent = `# Timeline for: ${prompt}\n\n`;
      timelineEvents.forEach((event, idx) => {
        markdownContent += `## ${event.title} (${event.date})\n\n${event.description}\n\n`;
      });
      await saveToFile(markdownContent, prompt);
      return res.status(200).json(timelineEvents);
    }

    // OLLAMA fallback (existing logic, but with improved prompt)
    const ollamaResponse = await fetch(process.env.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.MODEL_NAME,
        prompt: aiPrompt
      })
    });
    console.log('Ollama response status:', ollamaResponse.status);
    const rawResponse = await ollamaResponse.text();
    console.log('Ollama full raw response:', rawResponse);
    const lines = rawResponse.split(/\r?\n/).filter(l => l.trim().length > 0);
    let responseText = '';
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (typeof obj.response === 'string') responseText += obj.response;
      } catch (err) {}
    }
    responseText = responseText.replace(/```[a-zA-Z]*[\s\S]*?```/g, '');
    let jsonMatch = responseText.match(/\[.*\]/s); // match JSON array
    if (jsonMatch) {
      try {
        timelineEvents = JSON.parse(jsonMatch[0]);
        if (Array.isArray(timelineEvents) && timelineEvents.length > 0) {
          // Save markdown
          markdownContent = `# Timeline for: ${prompt}\n\n`;
          timelineEvents.forEach((event, idx) => {
            markdownContent += `## ${event.title} (${event.date})\n\n${event.description}\n\n`;
          });
          await saveToFile(markdownContent, prompt);
          return res.status(200).json(timelineEvents);
        }
      } catch (err) {
        console.error('Error parsing scenario array JSON:', err);
      }
    }
    // Fallback: single scenario object
    let singleJsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (singleJsonMatch) {
      try {
        timelineEvents = [JSON.parse(singleJsonMatch[0])];
        // Save markdown
        markdownContent = `# Timeline for: ${prompt}\n\n`;
        timelineEvents.forEach((event, idx) => {
          markdownContent += `## ${event.title} (${event.date})\n\n${event.description}\n\n`;
        });
        await saveToFile(markdownContent, prompt);
        return res.status(200).json(timelineEvents);
      } catch (err) {
        console.error('Error parsing single scenario JSON:', err);
      }
    }
    // Fallback: plain text as one event
    timelineEvents = [{
      title: `Scenario for: ${prompt}`,
      date: nowYear.toString(),
      description: responseText.trim() || 'No scenario returned.'
    }];
    // Save markdown
    markdownContent = `# Timeline for: ${prompt}\n\n`;
    timelineEvents.forEach((event, idx) => {
      markdownContent += `## ${event.title} (${event.date})\n\n${event.description}\n\n`;
    });
    await saveToFile(markdownContent, prompt);
    return res.status(200).json(timelineEvents);
  } catch (err) {
    // Bulletproof fallback: never send 500
    console.error('Error in /api/scenarios:', err);
    return res.status(200).json([
      {
        title: 'Scenario generation error',
        date: new Date().getFullYear().toString(),
        description: 'No scenario returned.'
      }
    ]);
  }
});

// --- Export session as Markdown ---
app.post('/api/export-session', async (req, res) => {
  try {
    const { sessionTitle, timelineEvents, expandedNodes } = req.body;
    if (!timelineEvents || !Array.isArray(timelineEvents)) {
      return res.status(400).json({ error: 'timelineEvents array required' });
    }
    // Recursively build markdown for timeline + expansions
    function buildMarkdown(events, expansions, level = 2) {
      let md = '';
      events.forEach((event, idx) => {
        md += `${'#'.repeat(level)} ${event.title} (${event.date})\n\n${event.description}\n\n`;
        // If expanded, recurse
        if (expansions && expansions[idx] && expansions[idx].children && expansions[idx].children.length > 0) {
          md += buildMarkdown(expansions[idx].children, expansions[idx].childrenExpanded, level + 1);
        }
      });
      return md;
    }
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hour = pad(now.getHours());
    const min = pad(now.getMinutes());
    let slug = (sessionTitle || 'session')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'session';
    const filename = `${year}${month}${day}-${hour}${min}-${slug}.md`;
    const directory = './logs';
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }
    let markdownContent = `# Session Timeline: ${sessionTitle || 'Untitled'}\n\n`;
    markdownContent += buildMarkdown(timelineEvents, expandedNodes, 2);
    await fs.promises.writeFile(`${directory}/${filename}`, markdownContent);
    return res.status(200).json({ success: true, filename });
  } catch (err) {
    console.error('Error exporting session:', err);
    return res.status(500).json({ error: 'Failed to export session.' });
  }
});

// Serve Markdown logs for download
app.get('/api/download-log/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(path.resolve(), 'logs', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.download(filePath, filename);
});

// Serve the index.html file for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(path.resolve(), 'index.html'))
})

// Only import and initialize OpenAI if environment variables are present
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) {
  const OpenAI = (await import('openai')).default;
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Define Zod schemas for structured outputs from the OpenAI API 

// Schema for the initial AI scenarios (positive in this case)
const ScenarioSchema = z.object({
  title: z.string(),
  description: z.string(),
  items: z.array(z.string()),
})

// Schema for the estimated timeline (ETA) 
const ETASchema = z.object({
  eta: z.string(),
})

// Schema for the historical analogy 
const AnalogySchema = z.object({
  event: z.string(),
  similarity: z.string(),
  lesson: z.string(),
})

// Schema for Stakeholder (Individual Stakeholder) (Updated)
const StakeholderSchema = z.object({
  name: z.string(),
  role: z.string(),
  description: z.string(), // Add description property
})

// Schema for Stakeholder Analysis (List of Stakeholders) 
const StakeholdersSchema = z.object({
  stakeholders: z.array(StakeholderSchema),
})

// Schema for Innovation (from The Innovator agent) 
const InnovationSchema = z.object({
  idea: z.string(),
  potential: z.string(),
  challenges: z.string(),
})

// Schema for Future Timelines (from The Futurist agent) 
const FutureTimelinesSchema = z.object({
  optimistic: z.string(),
  pessimistic: z.string(),
  realistic: z.string(),
  wildcard: z.string().optional(), // Optional wildcard event
})

// Function to generate future timelines for a scenario item 
async function generateFutureTimelines(scenarioItem) {
  try {
    if (!openai) {
      throw new Error('OpenAI is not initialized');
    }
    const timelinesPrompt = `
    Consider this step towards a positive AI scenario: "${scenarioItem}"

    Generate three potential future timelines for this step:

    * **Optimistic:** A timeline where advancements and adoption happen quickly and smoothly.
    * **Pessimistic:** A timeline where progress is slow, and challenges arise.
    * **Realistic:** A balanced timeline considering both potential advancements and likely obstacles.

    Optionally, include a "wildcard" event or breakthrough that could significantly alter any of these timelines.

    Format your response as a JSON object:

    {
      "optimistic": "Description of the optimistic timeline",
      "pessimistic": "Description of the pessimistic timeline",
      "realistic": "Description of the realistic timeline",
      "wildcard": "Description of a potential wildcard event (optional)"
    }
    `

    const timelines = await getStructuredOutput(
      timelinesPrompt,
      FutureTimelinesSchema
    )
    return timelines
  } catch (error) {
    console.error('Error generating future timelines:', error)
    throw error
  }
}

// Function to generate innovative ideas for a scenario item 
async function generateInnovation(scenarioItem) {
  try {
    if (!openai) {
      throw new Error('OpenAI is not initialized');
    }
    const innovationPrompt = `
    Consider this step towards a positive AI scenario: "${scenarioItem}"

    Generate a "moonshot" idea or innovation that could significantly enhance or accelerate this step, pushing the boundaries of what's currently possible.

    Format your response as a JSON object:

    {
      "idea": "Description of the innovative idea",
      "potential": "Explanation of the potential positive impact of this innovation",
      "challenges": "Potential challenges or obstacles to realizing this innovation"
    }
    `

    const innovation = await getStructuredOutput(
      innovationPrompt,
      InnovationSchema
    )
    return innovation
  } catch (error) {
    console.error('Error generating innovation:', error)
    throw error
  }
}

// Function to get structured output from the OpenAI API 
// It can optionally use a Zod schema for validation and parsing
async function getStructuredOutput(prompt, schema = null) {
  try {
    if (!openai) {
      throw new Error('OpenAI is not initialized');
    }
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      response_format: schema
        ? zodResponseFormat(schema, 'mySchema')
        : undefined, // Use schema if provided
    })

    return completion.choices[0].message.parsed
  } catch (error) {
    console.error('Error getting structured output from OpenAI:', error)
    throw error // Re-throw the error to be handled at a higher level
  }
}

// Function to generate Markdown content for a single scenario 
async function generateMarkdownForScenario(scenario, items) {
  try {
    let markdownContent = ''

    markdownContent += `## ${scenario.title}\n\n`
    markdownContent += `${scenario.description}\n\n`

    // Iterate through each item within the scenario
    for (const {
      item,
      eta,
      analogy,
      stakeholders,
      innovation,
      futureTimelines,
    } of items) {
      markdownContent += `### ${item}\n\n`
      markdownContent += `**ETA:** ${eta.eta}\n\n`

      // Add Future Timelines section 
      markdownContent += `**Future Timelines:**\n\n`
      markdownContent += `- **Optimistic:** ${futureTimelines.optimistic}\n`
      markdownContent += `- **Pessimistic:** ${futureTimelines.pessimistic}\n`
      markdownContent += `- **Realistic:** ${futureTimelines.realistic}\n`
      if (futureTimelines.wildcard) {
        markdownContent += `- **Wildcard Event:** ${futureTimelines.wildcard}\n`
      }
      markdownContent += '\n'

      markdownContent += `**Historical Analogy:**\n\n`
      markdownContent += `- **Event:** ${analogy.event}\n`
      markdownContent += `- **Similarity:** ${analogy.similarity}\n`
      markdownContent += `- **Lesson:** ${analogy.lesson}\n\n`

      markdownContent += `**Stakeholders:**\n\n`
      for (const stakeholder of stakeholders) {
        markdownContent += `- **${stakeholder.name}:** ${stakeholder.role} - ${stakeholder.description}\n`
      }
      markdownContent += '\n'

      // Add Innovation section 
      markdownContent += `**Innovation - Moonshot Idea:**\n\n`
      markdownContent += `${innovation.idea}\n\n`
      markdownContent += `**Potential Impact:** ${innovation.potential}\n\n`
      markdownContent += `**Challenges:** ${innovation.challenges}\n\n`
    }

    return markdownContent
  } catch (error) {
    console.error('Error generating Markdown from OpenAI:', error)
    throw error
  }
}

// Function to save content to a file with a short date and scenario in the filename 
// in a /logs directory
async function saveToFile(content, scenarioPrompt = '') {
  // Format: YYMMDD-HHMM-queryslug.md
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2); // last 2 digits
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hour = pad(now.getHours());
  const min = pad(now.getMinutes());
  // Sanitize scenario prompt for filename
  let slug = scenarioPrompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'scenario';
  const filename = `${year}${month}${day}-${hour}${min}-${slug}.md`;
  const directory = './logs';

  // Create the directory if it doesn't exist
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }

  try {
    await fs.promises.writeFile(`${directory}/${filename}`, content);
    console.log(`File '${filename}' saved to '${directory}' directory! `);
  } catch (err) {
    console.error(`Error writing to file '${filename}':`, err);
  }
}

// New function to generate topics
async function generateTopics() {
  const topicsPrompt = `Generate 10 diverse and interesting AI scenario topics for positive future outcomes. Each topic should be a brief phrase or sentence.`

  const topicsSchema = z.object({
    topics: z.array(z.string()),
  })

  const topics = await getStructuredOutput(topicsPrompt, topicsSchema)
  return topics.topics
}

// New function to get user input
async function getUserInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(
      'Enter a scenario prompt (or press Enter for AI-generated topics): ',
      (input) => {
        rl.close()
        resolve(input.trim())
      }
    )
  })
}

// New function to select a topic
async function selectTopic(topics) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log('Select a topic by entering its number (0-9):')
  topics.forEach((topic, index) => {
    console.log(`${index}: ${topic}`)
  })

  return new Promise((resolve) => {
    rl.question('Your selection: ', (input) => {
      rl.close()
      const selectedIndex = parseInt(input)
      if (selectedIndex >= 0 && selectedIndex < topics.length) {
        resolve(topics[selectedIndex])
      } else {
        console.log('Invalid selection. Using the first topic.')
        resolve(topics[0])
      }
    })
  })
}

// Function to perform stakeholder analysis for a scenario item 
async function analyzeStakeholders(scenarioItem) {
  try {
    if (!openai) {
      throw new Error('OpenAI is not initialized');
    }
    const stakeholderPrompt = `
    Identify up to 5 key stakeholders who would be significantly affected by the following AI scenario step: "${scenarioItem}"

    Consider governments, businesses, individuals, specific communities, or other relevant groups.

    Format your response as a JSON object with an array of stakeholder objects:

    {
      "stakeholders": [
        {
          "name": "Name or type of stakeholder",
          "role": "Role of the stakeholder (e.g., Beneficiary, Regulator, Developer)",
          "description": "Brief description of the stakeholder's role in this specific scenario" 
        },
        // ... more stakeholders (up to 5)
      ]
    }
    `

    const stakeholders = await getStructuredOutput(
      stakeholderPrompt,
      StakeholdersSchema
    )
    return stakeholders.stakeholders
  } catch (error) {
    console.error('Error analyzing stakeholders:', error)
    throw error
  }
}

// Function to generate ETA for the item 
async function generateETA(item) {
  try {
    if (!openai) {
      throw new Error('OpenAI is not initialized');
    }
    const etaPrompt = `Consider the following step towards a positive AI scenario: "${item}"

    Provide your best estimate for when this step could be realized, considering current technological trends and potential advancements. 
    
    Format your response as a JSON object with this structure:
    
    {
      "eta": "Concise sentence describing the estimated timeline." 
    }
    
    Be specific and provide a realistic timeframe whenever possible (e.g., "Within the next 5 years," "By the early 2030s," "Likely beyond 2050"). If the timeframe is highly uncertain, acknowledge the uncertainty and explain why.
    `
    const eta = await getStructuredOutput(etaPrompt, ETASchema)
    return eta
  } catch (error) {
    console.error('Error generating ETA:', error)
    throw error
  }
}

// Function to generate historical analogy for the item 
async function generateAnalogy(item) {
  try {
    if (!openai) {
      throw new Error('OpenAI is not initialized');
    }
    const analogyPrompt = `Consider this step towards a positive AI scenario: "${item}"

Provide a historical analogy that highlights a similar advancement or event that had a significant positive impact on humanity.

Format your response as a JSON object with this structure:

{
  "event": "Name or brief description of the historical event",
  "similarity": "Explanation of the key similarities between the historical event and the AI scenario step",
  "lesson": "A valuable lesson or insight that can be drawn from the historical event and applied to the AI scenario"
}

Focus on analogies that:
- Demonstrate the potential positive impact of technological advancements.
- Highlight the importance of careful planning, ethical considerations, and societal adaptation.
- Offer valuable lessons for navigating the challenges and opportunities of the AI scenario.
`
    const analogy = await getStructuredOutput(analogyPrompt, AnalogySchema)
    return analogy
  } catch (error) {
    console.error('Error generating analogy:', error)
    throw error
  }
}

// Updated main function
async function main() {
  try {
    let selectedTopic = await getUserInput()

    if (!selectedTopic) {
      const topics = await generateTopics()
      selectedTopic = await selectTopic(topics)
    }

    console.log(`Generating scenario based on: ${selectedTopic}`)

    // Modify the scenarios prompt to include the selected topic
    const scenariosPrompt = `Imagine a future where AI is used to create a more equitable, sustainable, and fulfilling world for everyone, focusing on the following topic: "${selectedTopic}" 

Describe 2 detailed and distinct scenarios illustrating how AI could positively advance humanity in this ideal future, related to the given topic. 

Ensure that each scenario explores a unique aspect of AI's positive potential and does not overlap significantly with other scenarios. Consider a wide range of domains where AI could have a transformative impact, such as:

- Social impact and governance
- Environmental protection and resource management
- Scientific breakthroughs and technological innovation
- Healthcare, well-being, and longevity
- Education, creativity, and self-fulfillment

Format the output as a JSON array like this:

[
  {
    "title": "Example Title 1", 
    "description": "Example Description 1", 
    "items": ["Item 1", "Item 2", "Item 3"]
  },
  // ... more scenarios
]

Each scenario object should include:
- "title": A short, descriptive title (maximum 20 words).
- "description": A concise explanation of the scenario (maximum 50 words).
- "items": A list of 3 to 5 specific steps or events that contribute to the scenario. 
`

    // Get the scenarios using the defined schema
    const scenariosResult = await getStructuredOutput(
      scenariosPrompt,
      ScenarioSchema
    )
    // Ensure scenarios is an array, even if only one scenario is returned
    const scenarios = Array.isArray(scenariosResult)
      ? scenariosResult
      : [scenariosResult]

    // Reset allScenariosData
    allScenariosData = []

    // Process each scenario 
    for (const scenario of scenarios) {
      console.log('Scenario:', scenario)

      // Array to store data for items within the current scenario
      const scenarioItemsData = []

      // Process each item (step) within the scenario 
      for (const item of scenario.items) {
        // Generate ETA for the item 
        const eta = await generateETA(item)

        // Generate historical analogy for the item 
        const analogy = await generateAnalogy(item)

        // Stakeholder Analysis 
        const stakeholders = await analyzeStakeholders(item)

        // Generate Innovation 
        const innovation = await generateInnovation(item)

        // Generate Future Timelines 
        const futureTimelines = await generateFutureTimelines(item)

        console.log('  Item:', item)
        console.log('    ETA:', eta)
        console.log('    Future Timelines:', futureTimelines)
        console.log('    Analogy:', analogy)
        console.log('    Stakeholders:', stakeholders)
        console.log('    Innovation:', innovation)

        // Add the data for the current item to the scenarioItemsData array
        scenarioItemsData.push({
          item,
          eta,
          analogy,
          stakeholders,
          innovation,
          futureTimelines,
        })
      }

      // Add the scenario and its items data to the allScenariosData array
      allScenariosData.push({ scenario, items: scenarioItemsData })
    }

    let finalMarkdownContent = '' // Initialize the final Markdown content

    // Add the main header and selected topic
    finalMarkdownContent += '# Positive Future Scenarios for AI\n\n'
    finalMarkdownContent += `Based on the topic: "${selectedTopic}"\n\n`
    finalMarkdownContent +=
      'TWO distinct scenarios illustrating how AI can transform humanity.\n\n'

    // Process each scenario 
    for (const { scenario, items } of allScenariosData) {
      console.log('Generating Markdown for scenario:', scenario.title) // Log the scenario being processed

      // Generate Markdown for the current scenario
      const scenarioMarkdown = await generateMarkdownForScenario(
        scenario,
        items
      )

      // Append the scenario Markdown to the final Markdown content
      finalMarkdownContent += scenarioMarkdown
    }

    // Save the final Markdown content to a file 
    await saveToFile(finalMarkdownContent);
  } catch (error) {
    console.error('Error in main function:', error)
  }
}

// Only run the CLI "main" function if CLI_MODE is set (default: run web server only)
const CLI_MODE = process.env.CLI_MODE === 'true';

if (CLI_MODE) {
  // Run CLI mode (interactive terminal)
  (async () => {
    try {
      await main();
      // Optionally, start the server after CLI completes
      app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
      });
    } catch (error) {
      console.error('Error in CLI mode:', error);
    }
  })();
} else {
  // Web API server only (no terminal prompts)
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}
