export const componentRegistry = [
  {
    id: 'appDiagram',
    name: 'Animated Architecture Diagram',
    description: 'An immersive, animated representation of system architecture and topology.',
    icon: 'Component',
    triggers: [/##\s+(Architecture|System Topology|Design|Infrastructure)/i, /\b(microservices|topology|system design|data flow)\b/i],
    defaultProps: {
      type: 'appDiagram',
    },
    reasoning: 'Matches keywords related to system architecture, design, and topology.'
  },
  {
    id: 'mermaid',
    name: 'Mermaid Flowchart',
    description: 'A visual flowchart or state diagram parsed from mermaid syntax.',
    icon: 'Network',
    triggers: [/```mermaid[\s\S]*?```/],
    defaultProps: {
      type: 'mermaid',
      code: 'flowchart LR\n  A[Start] --> B[Process]\n  B --> C[End]',
    },
    reasoning: 'Detected Mermaid code blocks in the markdown.'
  },
  {
    id: 'callout',
    name: 'Important Warning Callout',
    description: 'A highlighted block to call attention to warnings or important notes.',
    icon: 'AlertTriangle',
    triggers: [/(> \[!WARNING\]|> \[!IMPORTANT\]|\*\*Warning:\*\*|\*\*Important:\*\*)/i, /##\s+(Warnings?|Important Notes?)/i],
    defaultProps: {
      type: 'callout',
      variant: 'warning',
      title: 'Important Note',
      body: 'Review this section carefully before proceeding.',
    },
    reasoning: 'Detected warning or important note patterns in the text.'
  },
];
