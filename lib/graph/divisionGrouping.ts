import { ProfileNode } from '@/app/types/graph';

interface DivisionGroup {
  division: string;
  nodes: ProfileNode[];
  center: { x: number; y: number };
  radius: number;
}

// Calculate division groups from profile nodes
export function calculateDivisionGroups(
  nodes: any[], 
  selectedDivisions: string[]
): DivisionGroup[] {
  const divisionGroups: Map<string, ProfileNode[]> = new Map();
  
  // Group profile nodes by division
  nodes.forEach(node => {
    if (node.type === 'profile' && node.division && selectedDivisions.includes(node.division)) {
      const division = node.division;
      if (!divisionGroups.has(division)) {
        divisionGroups.set(division, []);
      }
      divisionGroups.get(division)!.push(node);
    }
  });
  
  // Calculate center and radius for each group
  const groups: DivisionGroup[] = [];
  
  divisionGroups.forEach((nodes, division) => {
    if (nodes.length === 0) return;
    
    // Calculate center point
    let centerX = 0;
    let centerY = 0;
    let validNodes = 0;
    
    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined && isFinite(node.x) && isFinite(node.y)) {
        centerX += node.x;
        centerY += node.y;
        validNodes++;
      }
    });
    
    if (validNodes === 0) return;
    
    centerX /= validNodes;
    centerY /= validNodes;
    
    // Calculate radius to encompass all nodes
    let maxDistance = 0;
    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined && isFinite(node.x) && isFinite(node.y)) {
        const distance = Math.sqrt(
          Math.pow(node.x - centerX, 2) + 
          Math.pow(node.y - centerY, 2)
        );
        maxDistance = Math.max(maxDistance, distance);
      }
    });
    
    // Add some padding to the radius
    const radius = maxDistance + 40;
    
    groups.push({
      division,
      nodes,
      center: { x: centerX, y: centerY },
      radius
    });
  });
  
  return groups;
}

// Apply force to keep division members together
export function applyDivisionForces(
  simulation: any,
  nodes: any[],
  selectedDivisions: string[]
) {
  // Custom force to pull division members together
  const divisionForce = (alpha: number) => {
    const divisionCenters: Map<string, { x: number; y: number; count: number }> = new Map();
    
    // Calculate division centers
    nodes.forEach(node => {
      if (node.type === 'profile' && node.division && selectedDivisions.includes(node.division)) {
        if (!divisionCenters.has(node.division)) {
          divisionCenters.set(node.division, { x: 0, y: 0, count: 0 });
        }
        const center = divisionCenters.get(node.division)!;
        center.x += node.x || 0;
        center.y += node.y || 0;
        center.count++;
      }
    });
    
    // Average the centers
    divisionCenters.forEach(center => {
      if (center.count > 0) {
        center.x /= center.count;
        center.y /= center.count;
      }
    });
    
    // Apply force to pull nodes toward their division center
    nodes.forEach(node => {
      if (node.type === 'profile' && node.division && selectedDivisions.includes(node.division)) {
        const center = divisionCenters.get(node.division);
        if (center && center.count > 1) {
          const dx = center.x - (node.x || 0);
          const dy = center.y - (node.y || 0);
          const strength = 0.1 * alpha; // Adjust strength as needed
          
          node.vx = (node.vx || 0) + dx * strength;
          node.vy = (node.vy || 0) + dy * strength;
        }
      }
    });
  };
  
  return divisionForce;
}