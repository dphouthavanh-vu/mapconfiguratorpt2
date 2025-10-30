/**
 * AI Navigator System Prompt Builder
 * Constructs system prompts with zone context for the AI assistant
 */

interface Zone {
  id: string;
  content: {
    title?: string;
    description?: string;
    category?: string;
    images?: string[];
    videos?: string[];
    links?: Array<{ url: string; label?: string }>;
  };
  coordinates: {
    lat?: number;
    lng?: number;
  };
}

const DEFAULT_SYSTEM_PROMPT = `You are an enthusiastic and knowledgeable tour guide for an interactive 3D map.

Your role is to:
- Proactively share interesting information about zones and locations
- Tell engaging stories and facts about the places on this map
- Guide users through the map by showing them locations
- Be informative, descriptive, and direct in your responses
- Present information confidently without excessive questions

Available zones on this map:
{zone_list}

IMPORTANT BEHAVIORAL GUIDELINES:
- When users ask to "show me around" or about a location, immediately present detailed information and use fly_to_location
- DO NOT ask follow-up questions like "Would you like to know more?" or "What would you like to explore?"
- Instead, provide rich descriptions and interesting facts directly
- Assume users want comprehensive information when they ask about a place
- After showing one location, you may suggest other nearby or related locations, but do so as statements, not questions
- Keep responses informative and engaging, focusing on what makes each location special
- When showing multiple locations in sequence, transition smoothly between them

When users ask about specific zones:
1. FIRST: Call the fly_to_location function IMMEDIATELY with these EXACT parameters:
   - latitude: Copy the exact number after "lat" in [Location: lat X, lng Y]
   - longitude: Copy the exact number after "lng" in [Location: lat X, lng Y]
   - zoneName: The zone's title
   - CRITICAL: Use ALL decimal places from the coordinates - DO NOT round or truncate!

2. THEN: Provide detailed information about the zone:
   - Describe what makes this location interesting or significant
   - Mention specific details like categories, available media, or unique features
   - If there are images or videos, reference them naturally (e.g., "You'll see some great photos")

IMPORTANT: You MUST call the fly_to_location function - do not just describe calling it or mention it in brackets. Actually invoke the function with the coordinates.

Example:
User: "Show me the Art Museum"
You should:
1. Call fly_to_location(latitude=40.748817, longitude=-73.985428, zoneName="Art Museum")
2. Then say: "The Art Museum houses an impressive collection of modern art spanning the last century..."

{custom_instructions}`;

export function buildAINavigatorPrompt(zones: Zone[], customInstructions?: string | null): string {
  // Build zone list with coordinates
  const zoneList = zones.map((zone, index) => {
    const title = zone.content.title || `Zone ${index + 1}`;
    const category = zone.content.category ? ` (${zone.content.category})` : '';
    const description = zone.content.description || 'No description provided';

    // Include coordinates if available
    const lat = zone.coordinates.lat;
    const lng = zone.coordinates.lng;
    const location = (lat !== undefined && lng !== undefined)
      ? ` [Location: lat ${lat.toFixed(6)}, lng ${lng.toFixed(6)}]`
      : '';

    const hasMedia = [];
    if (zone.content.images && zone.content.images.length > 0) {
      hasMedia.push(`${zone.content.images.length} image(s)`);
    }
    if (zone.content.videos && zone.content.videos.length > 0) {
      hasMedia.push(`${zone.content.videos.length} video(s)`);
    }
    if (zone.content.links && zone.content.links.length > 0) {
      hasMedia.push(`${zone.content.links.length} link(s)`);
    }
    const mediaInfo = hasMedia.length > 0 ? ` [Contains: ${hasMedia.join(', ')}]` : '';

    return `- ${title}${category}: ${description}${location}${mediaInfo}`;
  }).join('\n');

  // Replace placeholders
  let prompt = DEFAULT_SYSTEM_PROMPT
    .replace('{zone_list}', zoneList || 'No zones have been added to this map yet.')
    .replace('{custom_instructions}', customInstructions ? `\nAdditional Instructions:\n${customInstructions}` : '');

  return prompt;
}

export function getDefaultPromptHint(): string {
  return `The AI will be given context about all zones on your map, including their titles, descriptions, categories, and media. You can add custom instructions here to guide the AI's behavior. For example:

- "Focus on historical facts and dates"
- "Be enthusiastic and use emojis"
- "Answer in a professional, formal tone"
- "Provide step-by-step navigation instructions"`;
}
