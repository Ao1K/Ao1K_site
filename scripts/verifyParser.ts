import {
  cube3x3,
  INPUT_RULES_3X3,
  MOVES_3X3,
  ROTATION_GROUP_3X3,
  ROTATIONS_3X3,
  type Move3x3,
  type Rotation3x3,
} from '../utils/parser/cube3x3'
import { getParser } from '../utils/parser'

const failures: string[] = []
const allowedCounts = new Map<string, number>()

function compare(label: string, expected: string, actual: string, allowedReason?: string | false) {
  if (expected === actual) return
  if (allowedReason) {
    allowedCounts.set(allowedReason, (allowedCounts.get(allowedReason) ?? 0) + 1)
    return
  }
  failures.push(`${label}: expected "${expected}", got "${actual}"`)
}

compare('move count', '96', String(new Set(MOVES_3X3).size))

for (const move of MOVES_3X3) {
  compare(`parseMove(${move})`, move, String(cube3x3.parseMove(move)))
  compare(`layer+suffix(${move})`, move, cube3x3.make(cube3x3.layer(move), cube3x3.amount(move)))

  for (const plane of ['M', 'S', 'E'] as const) {
    compare(`mirror ${plane} twice ${move}`, move, cube3x3.mirror(cube3x3.mirror([move], plane), plane)[0])
  }
  compare(`invert twice ${move}`, move, cube3x3.invert(cube3x3.invert([move]))[0])

  compare(`stm ${move}`, String(/[^xyz2']/.test(move) ? 1 : 0), String(cube3x3.count([move], 'stm')))

  for (const rotation of ROTATIONS_3X3) {
    const inverseRotation = cube3x3.invert([rotation])[0] as Rotation3x3
    compare(
      `rotate ${rotation} then ${inverseRotation} ${move}`,
      move,
      cube3x3.rotate(cube3x3.rotate([move], rotation), inverseRotation)[0],
    )
  }
  compare(`rotate y2 ${move}`, cube3x3.rotate(cube3x3.rotate([move], 'y'), 'y')[0], cube3x3.rotate([move], 'y2')[0])
  compare(`rotate y2' ${move}`, cube3x3.rotate([move], 'y2')[0], cube3x3.rotate([move], "y2'")[0])
  compare(`rotate x' ${move}`, cube3x3.rotate(cube3x3.rotate(cube3x3.rotate([move], 'x'), 'x'), 'x')[0], cube3x3.rotate([move], "x'")[0])
}

for (const [axis, search] of Object.entries(ROTATION_GROUP_3X3)) {
  compare(`rotation group ${axis} size`, '24', String(search.size))
}

const aliasResult = cube3x3.parse("  Rw' Uw2  R3 Q x2'\tFw3'  ")
compare('parse alias moves', "r' u2 R3 x2' f3'", cube3x3.format(aliasResult.moves))
compare('parse alias invalid', 'Q', aliasResult.invalid.join(' '))
compare('parseTrusted', "R U' R3 M2'", cube3x3.format(cube3x3.parseTrusted(" R U'  R3 M2' ")))
compare('getParser', 'true', String(getParser('3x3') === cube3x3))
compare('normalize', "R' R2 R R2 M' x2", cube3x3.format(cube3x3.normalize(cube3x3.parse("R3 R2' R3' R2 M' x2'").moves)))

const countSample = cube3x3.parse("R U2 M x M2' y2 r3").moves
compare('htm', '7', String(cube3x3.count(countSample, 'htm')))
compare('qtm', '10', String(cube3x3.count(countSample, 'qtm')))
compare('stm', '5', String(cube3x3.count(countSample, 'stm')))
compare('etm', '7', String(cube3x3.count(countSample, 'etm')))

const combineInputs: [string, string][] = [
  ['R R', 'R2'],
  ["R R'", ''],
  ["R2 R2'", ''],
  ['R3', 'R3'],
  ['R3 R', ''],
  ["U R R' U'", ''],
  ["R2' R", "R'"],
  ['x x', 'x2'],
  ['M M M', "M'"],
  ['R r', 'R r'],
  ["R3' R3'", 'R2'],
  ["U2' U2' U", 'U'],
  ["R U R' U' R U2 R'", "R U R' U' R U2 R'"],
  ['F F F F', ''],
  ["y2' y2", ''],
  ["R L R' L'", "R L R' L'"],
  ['D3 D3 D3', 'D'],
  ["U U' U U", 'U2'],
]
for (const [input, expected] of combineInputs) {
  compare(`combine "${input}"`, expected, cube3x3.format(cube3x3.combine(cube3x3.parse(input).moves)))
}

const rotationSequences: Rotation3x3[][] = [...ROTATIONS_3X3.map(rotation => [rotation])]
for (const first of ROTATIONS_3X3) {
  for (const second of ROTATIONS_3X3) {
    rotationSequences.push([first, second])
    for (const third of ROTATIONS_3X3) rotationSequences.push([first, second, third])
  }
}
const rotateThrough = (rotations: readonly Rotation3x3[]) =>
  cube3x3.format(rotations.reduce((moves, rotation) => cube3x3.rotate(moves, rotation), [...MOVES_3X3]))
for (const sequence of rotationSequences) {
  const simplified = cube3x3.simplifyRotations(sequence)
  const label = `simplifyRotations "${cube3x3.format(sequence)}" -> "${cube3x3.format(simplified)}"`
  compare(`${label} orientation`, rotateThrough(sequence), rotateThrough(simplified))
  compare(`${label} length`, 'true', String(simplified.length <= 2))
}
compare('simplifyRotations empty', '', cube3x3.simplifyRotations([]).join(' '))

const inputRuleCases: [string, string][] = [
  ['XX', 'x2'],
  ['RR', 'R2'],
  ['R2R', 'R3'],
  ['UU', 'U2'],
  ['RU', 'R U'],
  ["R'U", "R' U"],
  ['U2D', 'U2 D'],
  ['U2U', 'U2 U'],
  ['r2r', 'r3'],
  ['UD ', '(U D) '],
  ["DU' ", "(U' D) "],
  ['R U', 'R U'],
  ['Rw', 'r'],
  ["RW'", "r'"],
  ['FwU', 'f U'],
  ['Rw2', 'r2'],
  ["RW2'", "r2'"],
  ['Rw3 U', 'r3 U'],
]
for (const [input, expected] of inputRuleCases) {
  const output = cube3x3.inputRules.reduce((current, rule) => current.replace(rule.pattern, rule.replacement), input)
  compare(`inputRules "${input}"`, expected, output)
}
compare('inputRules is shared constant', 'true', String(cube3x3.inputRules === INPUT_RULES_3X3))

const sharedInstance: Move3x3 = cube3x3.parseTrusted('R')[0]
compare('parseTrusted shares table string', 'R', sharedInstance)

for (const [reason, count] of allowedCounts) console.log(`allowed (${count}): ${reason}`)
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`)
  console.error(`${failures.length} mismatches`)
  process.exit(1)
}
console.log(`verify-parser passed: ${MOVES_3X3.length} moves, ${combineInputs.length} combine inputs, ${rotationSequences.length} rotation sequences`)
