```mermaid
%%{init: {'flowchart': {'curve': 'stepBefore'}}}%%
graph LR
classDef default fill:#ffffff,stroke:#000000,stroke-width:2px,color:#000000;
classDef folder fill:#f0f0f0,stroke:#000000,stroke-width:2px,color:#000000,font-weight:bold;
classDef sub fill:#ffffff,stroke:#000000,stroke-width:1px,color:#000000,stroke-dasharray: 5 5;

A["src/"]:::folder --> B["components/"]:::folder
A --> C["shared / core/"]:::folder
A --> D["services / api/"]:::folder
A --> E["pages/"]:::folder

%% Components Directory Branches
B --> F1["projects/"]:::folder
B --> F2["participants/"]:::folder
B --> F3["measurements/"]:::folder
B --> F4["dashboard/"]:::folder
B --> F5["supervisor/"]:::folder
B --> F6["researcher/"]:::folder

%% Shared Directory Branches
C --> C1["ui/ <br/> Buttons, Modals, Graphs"]:::sub
C --> C2["utils/ <br/> Anonymization, Math"]:::sub
C --> C3["hooks/ <br/> Permissions, Global State"]:::sub

%% Services Directory Branches
D --> D1["db.client.js <br/> Cloud Data Storage"]:::sub
D --> D2["llm.client.js <br/> OpenAI API Connection"]:::sub

%% Pages Directory Branches
E --> E1["Routing & Layout"]:::sub