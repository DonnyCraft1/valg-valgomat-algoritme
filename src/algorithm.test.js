const tap = require("tap");
const jsc = require("jsverify");

const { calculateResult: algorithm2017 } = require("./assets/algorithm2017.js");
const { distance } = require("./algorithm.js");
const { toPositions } = require("./domain/positions.js");
const {
  positions: positionsMock,
  position: positionMock
} = require("./__helpers/mocks.js");

function runAlgoritme2017({ party, voter }) {
  function mapToOldAnswer(positions, statementId) {
    /*
    Old positions structure:
    type Poisitions {
      statementId: number,
      selectedAlternative: {
        id: number,
        label: string,
        modifier: string,
        stance: AlternativeStance,
      },
      isPrioritized?: boolean
    }
    */
    return {
      statementId,
      selectedAlternative: {
        id: Math.random(),
        label: "N/A",
        modifier: "N/A",
        stance: positions[statementId].value
      },
      isPrioritized: false
    };
  }

  let oldAnswer = Object.keys(voter).map(mapToOldAnswer.bind(null, voter));
  let oldParties = [
    {
      id: 0,
      answers: Object.keys(party).map(mapToOldAnswer.bind(null, party))
    }
  ];

  let [closeness] = algorithm2017(oldParties, oldAnswer);

  return closeness.scorePercent;
}

function arrayToPositionsHelper(check) {
  // The order of keys is not really interesing here,
  // but needed for the algorithm to do its thing.
  return function([arr1, arr2]) {
    let vector1 = arr1.map((v, i) => [i, v]);
    let vector2 = arr2.map((v, i) => [i, v]);
    return check([toPositions(vector1), toPositions(vector2)]);
  };
}

let arbitraryPositions = jsc.array(jsc.number(-2, 2));

// Arbitrary set of positions without skips
let arbitraryPositionsWithoutZeroes = jsc.array(
  jsc.oneof(jsc.integer(-2, -1), jsc.integer(1, 2))
);

let arbitraryPositionsOnlyZeroes = jsc.array(jsc.constant(0));

// Property based tests

// NOTE: This test and associated assets can probably be deleted after the election in 2019.
tap.test("identical to 2017 algorithm", function(t) {
  // Ensure equal length and therefore identical set of answered statements.
  // Handling of un-even sets of answered statements is different.
  // Filtering out skipped statements works differently, so we'll avoid that.
  let arbitraryPositionsPair = jsc.suchthat(
    jsc.pair(arbitraryPositionsWithoutZeroes, arbitraryPositionsWithoutZeroes),
    ([a, b]) => a.length === b.length
  );

  function check([a, b]) {
    let d = distance(a, b);
    let dOld = runAlgoritme2017({ party: a, voter: b });

    return d === dOld;
  }

  let wrappedCheck = arrayToPositionsHelper(check);

  jsc.assert(jsc.forall(arbitraryPositionsPair, wrappedCheck));
  t.end();
});

tap.test("algorithm is symmetrical", function(t) {
  let arbitraryPositionsPair = jsc.suchthat(
    jsc.pair(arbitraryPositions, arbitraryPositions),
    ([a, b]) => a.length > 10 && b.length > 10
  );

  function check([a, b]) {
    let distanceA = distance(a, b);
    let distanceB = distance(b, a);

    return distanceA === distanceB;
  }

  let wrappedCheck = arrayToPositionsHelper(check);

  jsc.assert(jsc.forall(arbitraryPositionsPair, wrappedCheck));
  t.end();
});

tap.test("not answered and missing are identical", function(t) {
  let arbitraryPositionsPair = jsc.pair(
    arbitraryPositionsOnlyZeroes,
    jsc.constant([])
  );

  function check([a, b]) {
    return distance(a, b) === 0;
  }

  let wrappedCheck = arrayToPositionsHelper(check);

  jsc.assert(jsc.forall(arbitraryPositionsPair, wrappedCheck));
  t.end();
});

tap.test("handles identical set of answered statements", function(t) {
  // Ensure equal length, to have identical sets of answered statements
  let arbitraryPositionsPair = jsc.suchthat(
    jsc.pair(arbitraryPositions, arbitraryPositions),
    ([a, b]) => a.length === b.length
  );

  function check([a, b]) {
    let d = distance(a, b);

    return d <= 1 && d >= 0;
  }

  let wrappedCheck = arrayToPositionsHelper(check);

  jsc.assert(jsc.forall(arbitraryPositionsPair, wrappedCheck));
  t.end();
});

tap.test("handles uneven number of answered statements", function(t) {
  // Ensure un-even length.
  let arbitraryPositionsPair = jsc.suchthat(
    jsc.pair(arbitraryPositions, arbitraryPositions),
    ([a, b]) => a.length !== b.length
  );

  function check([a, b]) {
    let d = distance(a, b);

    return d <= 1 && d >= 0;
  }

  let wrappedCheck = arrayToPositionsHelper(check);

  jsc.assert(jsc.forall(arbitraryPositionsPair, wrappedCheck));
  t.end();
});

// Example based tests
tap.test("both empty", function(t) {
  let a = {};
  let b = {};

  t.ok(distance(a, b) === 0);
  t.end();
});

tap.test("left-empty", function(t) {
  let a = positionsMock({ n: 2 });
  let b = {};

  t.ok(distance(a, b) === 0);
  t.end();
});

tap.test("right-empty", function(t) {
  let a = {};
  let b = positionsMock({ n: 2 });

  t.ok(distance(a, b) === 0);
  t.end();
});

tap.test("left just-0s", function(t) {
  let n = 2;
  let a = positionsMock({ n, positionMock: () => 0 });
  let b = positionsMock({ n });

  t.ok(distance(a, b) === 0);
  t.end();
});

tap.test("right just-0s", function(t) {
  let n = 2;
  let a = positionsMock({ n });
  let b = positionsMock({ n, positionMock: () => 0 });

  t.ok(distance(a, b) === 0);
  t.end();
});

tap.test("both just-0s", function(t) {
  let n = 2;
  let a = positionsMock({ n, positionMock: () => 0 });
  let b = positionsMock({ n, positionMock: () => 0 });

  t.ok(distance(a, b) === 0);
  t.end();
});

tap.test("left not answered", function(t) {
  let a = toPositions([[0, -2], [1, 1], [2, 2]]);
  let b = toPositions([[0, 1], [1, 1], [2, 0]]);

  t.ok(distance(a, b) === (8 - 3) / 8);
  t.end();
});

tap.test("left missing", function(t) {
  let a = toPositions([[0, -2], [1, 1], [2, 2]]);
  let b = toPositions([[0, 1], [1, 1]]);

  t.ok(distance(a, b) === (8 - 3) / 8);
  t.end();
});

tap.test("right not answered", function(t) {
  let a = toPositions([[0, 1], [1, 1], [2, 0]]);
  let b = toPositions([[0, -2], [1, 1], [2, 2]]);

  t.ok(distance(a, b) === (8 - 3) / 8);
  t.end();
});

tap.test("right missing", function(t) {
  let a = toPositions([[0, 1], [1, 1]]);
  let b = toPositions([[0, -2], [1, 1], [2, 2]]);

  t.ok(distance(a, b) === (8 - 3) / 8);
  t.end();
});

tap.test("both not answered", function(t) {
  let a = toPositions([[0, 1], [1, 1], [2, 0], [3, -1]]);
  let b = toPositions([[0, -2], [1, 1], [2, 2], [3, 0]]);

  t.ok(distance(a, b) === (8 - 3) / 8);
  t.end();
});

tap.test("both missing", function(t) {
  let a = toPositions([[0, 1], [1, 1], [3, -1]]);
  let b = toPositions([[0, -2], [1, 1], [2, 2]]);

  t.ok(distance(a, b) === (8 - 3) / 8);
  t.end();
});

tap.test("symmetrical with example left-block", function(t) {
  let left = [
    ["3", -0.25],
    ["8", -0.25],
    ["16", -0.25],
    ["23", 0.25],
    ["38", -0.25],
    ["42", -0.5],
    ["63", -0.5],
    ["64", 0.25],
    ["71", -0.25],
    ["142", -0.25],
    ["222", -0.25],
    ["391", 0.25],
    ["411", -0.5],
    ["432", -0.5],
    ["442", 0.25]
  ];
  let voter = [
    ["3", positionMock()],
    ["8", positionMock()],
    ["16", positionMock()],
    ["23", positionMock()],
    ["38", positionMock()],
    ["42", positionMock()],
    ["63", positionMock()],
    ["64", positionMock()],
    ["71", positionMock()],
    ["142", positionMock()],
    ["222", positionMock()],
    ["391", positionMock()],
    ["411", positionMock()],
    ["432", positionMock()],
    ["442", positionMock()]
  ];
  let a = toPositions(left);
  let b = toPositions(voter);

  let distanceA = distance(a, b);
  let distanceB = distance(b, a);

  t.ok(distanceA === distanceB);
  t.end();
});

tap.test("symmetrical with example centre-block", function(t) {
  let centre = [
    ["3", 0.33],
    ["8", -0.66],
    ["16", 0.33],
    ["23", -0.66],
    ["38", -0.33],
    ["42", 0.66],
    ["63", -0.66],
    ["64", 0.33],
    ["71", 0.33],
    ["142", 0.66],
    ["222", 0.33],
    ["391", -0.33],
    ["411", -0.66],
    ["432", 0.33],
    ["442", 0.66]
  ];
  let voter = [
    ["3", positionMock()],
    ["8", positionMock()],
    ["16", positionMock()],
    ["23", positionMock()],
    ["38", positionMock()],
    ["42", positionMock()],
    ["63", positionMock()],
    ["64", positionMock()],
    ["71", positionMock()],
    ["142", positionMock()],
    ["222", positionMock()],
    ["391", positionMock()],
    ["411", positionMock()],
    ["432", positionMock()],
    ["442", positionMock()]
  ];
  let a = toPositions(centre);
  let b = toPositions(voter);

  let distanceA = distance(a, b);
  let distanceB = distance(b, a);

  t.ok(distanceA === distanceB);
  t.end();
});

tap.test("symmetrical with example right-block", function(t) {
  let right = [
    ["3", 1],
    ["8", 1],
    ["16", -1],
    ["23", 1],
    ["38", -0.5],
    ["42", 1],
    ["63", -0.5],
    ["64", -0.5],
    ["71", -1],
    ["142", -1],
    ["222", -1],
    ["391", -1],
    ["411", -1],
    ["432", 1],
    ["442", -1]
  ];
  let voter = [
    ["3", positionMock()],
    ["8", positionMock()],
    ["16", positionMock()],
    ["23", positionMock()],
    ["38", positionMock()],
    ["42", positionMock()],
    ["63", positionMock()],
    ["64", positionMock()],
    ["71", positionMock()],
    ["142", positionMock()],
    ["222", positionMock()],
    ["391", positionMock()],
    ["411", positionMock()],
    ["432", positionMock()],
    ["442", positionMock()]
  ];
  let a = toPositions(right);
  let b = toPositions(voter);

  let distanceA = distance(a, b);
  let distanceB = distance(b, a);

  t.ok(distanceA === distanceB);
  t.end();
});

tap.test("readme example", function(t) {
  let a = toPositions([[0, 1], [1, -1]]);
  let b = toPositions([[0, 0], [1, -2]]);

  t.ok(distance(a, b) === 0.75);
  t.end();
});
