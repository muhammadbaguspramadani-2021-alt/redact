## [THE_PROBLEM] (THE LETHAL BOTTLENECK IN HUMAN RIGHTS INVESTIGATIONS)

To build this application correctly, you must deeply understand the hostile environment in which the user operates. The target users are human rights defenders, investigative journalists, and NGO operatives working in conflict zones and authoritarian regimes (e.g., Myanmar, Sudan, Gaza).

**1. The Cloud API Death Sentence (Fatal OpSec):**
To make raw evidence actionable for international bodies like the ICC, it must be transcribed, translated into standard English, and formatted into structured reports. Modern developers default to using Cloud AI (OpenAI, Anthropic, AWS) for this. However, authoritarian state actors own the local ISPs and deploy Deep Packet Inspection (DPI). Sending raw, unencrypted audio of a dissident's testimony to a cloud server means the state intelligence apparatus will intercept the payload. The use of Cloud APIs directly exposes the source's voice, identity, and IP address, resulting in immediate, lethal consequences. Cloud AI is not a solution here; it is a surveillance hazard.

**2. Weaponized Connectivity (Internet Kill Switches):**
Regimes routinely execute total cellular and internet blackouts to mask military clearance operations and human rights abuses. Any application that requires an external API call to function becomes a useless brick exactly at the moment it is needed most. Connectivity cannot be assumed; it must be treated as hostile and unreliable.

**3. The Data Graveyard and Smuggling Risks:**
Because processing data online is operational suicide, investigators are forced to hoard terabytes of raw, unstructured evidence (hundreds of hours of local-dialect audio, thousands of photos) on physical SD cards or hard drives. This creates a massive intelligence bottleneck. To process it safely, these drives must be physically smuggled across heavily militarized borders. If an investigator is stopped at a checkpoint and their unencrypted hard drive is seized, the evidence is destroyed forever, and the investigator is compromised. 

**4. The Core Engineering Mandate:**
The bottleneck must be solved at the point of capture. We cannot bring the data to the AI; we must bring the AI to the data. The application must ingest raw trauma, process it into a lightweight structured format, and lock it inside a cryptographic vault entirely on the edge device, running purely on local silicon, before the device ever touches a network.