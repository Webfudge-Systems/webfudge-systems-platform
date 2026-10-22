import { componentRegistry } from './componentRegistry';

export function analyzeReadmeForBlocks(markdown = '') {
  const suggestedBlocks = [];
  
  if (!markdown) return suggestedBlocks;

  componentRegistry.forEach((component) => {
    let matched = false;
    
    for (const trigger of component.triggers) {
      if (trigger.test(markdown)) {
        matched = true;
        break;
      }
    }

    if (matched) {
      // Create a fresh copy of default props so mutations don't leak
      const blockProps = JSON.parse(JSON.stringify(component.defaultProps));

      // Special handling: extract mermaid code if we found a mermaid block
      if (component.id === 'mermaid') {
        const match = markdown.match(/```mermaid\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          blockProps.code = match[1].trim();
        }
      }

      suggestedBlocks.push({
        id: component.id,
        name: component.name,
        icon: component.icon,
        reasoning: component.reasoning,
        blockProps,
      });
    }
  });

  return suggestedBlocks;
}
