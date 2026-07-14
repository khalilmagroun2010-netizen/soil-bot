import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from groq import Groq

load_dotenv()

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Serve static files from current folder
app = Flask(__name__, static_folder=".", static_url_path="")

# ============================================================
# SOIL PROTECTION PROJECT KNOWLEDGE BASE
# ============================================================
SOIL_PROJECT_BASE = """
You are Soil Bot, the official custom-built AI assistant for the Soil Protection Project (5th Edition).
Your creators are Iyed Jegham and Mohamed Khalil Magroun.
Contact Phone: 58585858
Contact Email: bot.02@gmail.com

PROJECT OVERVIEW & OBJECTIVE:
- Problem: Global overconsumption of paper (e.g., China consumed over 21.84 million tons of corrugated paper between Jan-Oct 2025 and dumped most of it). Concurrently, excessive chemical fertilizers cause heavy metal soil contamination, disrupt nutrient cycles, kill helpful microorganisms, and cause roughly 500,000 poisoning cases annually.
- Solution: An environmentally friendly way of turning waste paper and plant biomass into fully bio-based fertilizer through enzyme-assisted composting. This decreases reliance on chemical inputs and promotes sustainable recycling.

RESEARCH & BIOCHEMICAL PROCESS:
- Enzyme Treatment vs Chemical Treatment: Enzymes break down specific parts of ink and paper (targeting protein-based binders, starch coatings, oils, grease, and loosening cellulose fibers). This cleans out harmful ink residues that would otherwise damage microbes or block plant nutrient uptake.
- Nutrients: Mixing carbon-rich paper with nitrogen-rich plant biomass (specifically Malva) increases key nutrients compared to chemical alternatives: soil organic matter increases by ~24%, total nitrogen by 33%, total phosphorus by 24%, and total potassium by 45%. 
- Humus Formation: Tracks over 12 weeks. Hemicellulose (HC) and cellulose (CL) decrease as microbes break them down, while stable Fulvic Acid (FA) and Humic Acid (HA) increase, creating rich humus.
- Chemical Decomposition Equations:
  1) C6H10O5 + 6O2 -> 6CO2 + 5H2O + energy (heat)
  2) (C6H10O5)n + O2 -> CO2 + H2O + Humus

PROTOTYPE COMPONENTS:
1. Mini Paper Shredder: Mounted on top, cuts paper and plant matter into small pieces to maximize surface area for faster microbial decomposition.
2. Sealed Container: A blue container holding the mixture, featuring small holes on the sides for controlled aeration essential to aerobic microorganisms.
3. Sprayer: An orange water sprayer connected by a tube to evenly apply water and enzymes to maintain humidity and support microbial activity.

8-STEP IMPLEMENTATION MECHANISM:
1. Collect waste paper and organic plant biomass such as Malva sylvestris, then shred them.
2. Place shredded materials into the container and add soil along with vegetable waste (provides natural microorganisms).
3. Add water for moisture and enzymes to break down ink residues and speed up breakdown.
4. Mix all components thoroughly for even distribution.
5. Close container, ensuring small holes allow air circulation for aerobic microbes.
6. Leave the mixture to decompose via Composting.
7. Water regularly to sustain optimal microbial environments.
8. Harvest the natural, nutrient-rich, dark, crumbly, earthy-smelling organic bio-fertilizer.

EXPECTED RESULTS:
- Adding organic waste materials (like paper, Malva, bagasse, coconut husk, or biochar) results in up to a 190% increase in plant root mass compared to pure chemical fertilizer controls.

FUTURE WORK:
- Plans tos develop a full-scale, automated machine where waste paper, enzymes, and water can be added directly, running independently to yield bio-fertilizer automatically on commercial farms.

ROBOTIC OUTPUT RULES:
1. Keep responses clear, polite, and well-structured.
2. Use double newlines for paragraph breaks when explaining complex topics.
"""

@app.route("/")
def home():
    return send_from_directory(".", "ai web.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.json
        history = data.get("history", [])

        if not history:
            return jsonify({"error": "Chat history is empty"}), 400

        # Inject system prompt at start of conversation history
        messages_payload = [{"role": "system", "content": SOIL_PROJECT_BASE}] + history

        chat_completion = client.chat.completions.create(
            messages=messages_payload,
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )
        
        bot_response = chat_completion.choices[0].message.content
        return jsonify({"response": bot_response})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)