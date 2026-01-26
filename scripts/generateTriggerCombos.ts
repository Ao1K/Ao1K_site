/**
 * Generate combinations of two triggers for Rubik's cube algorithms
 * A trigger is 3 moves where the first move is undone by the third
 */

import * as fs from 'fs';
import * as path from 'path';

// Define the move types
const rMoves = ['R', "R'", 'L', "L'"];
const uMoves = ['U', "U'", 'U2'];

// Generate all possible triggers
function generateTriggers(): string[] {
  const triggers: string[] = [];
  
  for (const startMove of rMoves) {
    for (const middleMove of uMoves) {
      // The end move is the inverse of the start move
      let endMove: string;
      if (startMove === 'R') endMove = "R'";
      else if (startMove === "R'") endMove = 'R';
      else if (startMove === 'L') endMove = "L'";
      else endMove = 'L'; // L' -> L
      
      const trigger = `${startMove} ${middleMove} ${endMove}`;
      triggers.push(trigger);
    }
  }
  
  return triggers;
}

// Simplify a combination by combining consecutive identical moves
function simplifyCombo(combo: string): string {
  const moves = combo.split(' ');
  const simplified: string[] = [];
  
  for (let i = 0; i < moves.length; i++) {
    if (i < moves.length - 1 && moves[i] === moves[i + 1]) {
      // Two identical moves in a row
      const move = moves[i];
      if (move.endsWith("'")) {
        simplified.push(move.slice(0, -1) + "2'");
      } else {
        simplified.push(move + '2');
      }
      i++; // Skip the next move since we combined it
    } else {
      simplified.push(moves[i]);
    }
  }
  
  return simplified.join(' ');
}

// Generate combinations of two triggers with optional U move in between
function generateCombinations(): string[] {
  const triggers = generateTriggers();
  const combinations: string[] = [];
  const cancelPatterns = ["R R'", "R' R", "L' L", "L L'"];
  
  // No U move between triggers
  for (const trigger1 of triggers) {
    for (const trigger2 of triggers) {
      const combo = `${trigger1} ${trigger2}`;
      // Check if combo contains any cancel patterns
      if (!cancelPatterns.some(pattern => combo.includes(pattern))) {
        combinations.push(simplifyCombo(combo));
      }
    }
  }
  
  // With U move between triggers
  for (const trigger1 of triggers) {
    for (const uMove of uMoves) {
      for (const trigger2 of triggers) {
        const combo = `${trigger1} ${uMove} ${trigger2}`;
        // Check if combo contains any cancel patterns
        if (!cancelPatterns.some(pattern => combo.includes(pattern))) {
          combinations.push(simplifyCombo(combo));
        }
      }
    }
  }
  
  return combinations;
}

// Main execution
function main() {
  const triggers = generateTriggers();
  const combinations = generateCombinations();
  
  let output = '';
  
  output += `Generated ${triggers.length} triggers:\n\n`;
  triggers.forEach((trigger, i) => {
    output += `${i + 1}. ${trigger}\n`;
  });
  
  output += `\n${'='.repeat(60)}\n\n`;
  
  output += `Generated ${combinations.length} trigger combinations:\n\n`;
  combinations.forEach((combo, i) => {
    output += `${combo}\n`;
  });
  
  output += `\nTotal combinations: ${combinations.length}\n`;
  output += `- Without U move between: ${triggers.length * triggers.length}\n`;
  output += `- With U move between: ${triggers.length * uMoves.length * triggers.length}\n`;
  
  // Write to file
  const outputPath = path.join(__dirname, '..', 'trigger-combinations.txt');
  fs.writeFileSync(outputPath, output, 'utf-8');
  
  console.log(`✓ Successfully wrote ${combinations.length} combinations to ${outputPath}`);
}

main();
