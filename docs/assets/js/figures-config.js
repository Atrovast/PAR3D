/*
 * Configuration for the interactive QA figure (expt_more_qa).
 *
 * One entry per example. Fields:
 *   id        : stable identifier
 *   cloud     : binary PLY filename under assets/pointclouds/
 *   dataset   : source benchmark label shown as a tag
 *   view      : camera pose from tools/pose-picker.html. When null, the viewer
 *               auto-frames the cloud so the page still works before alignment.
 *   pointSize : world-space point size (also tuned in the pose picker)
 *   question  : the prompt text
 *   gt        : ground-truth answer
 *   llava     : 3D-LLaVA answer (comparison baseline)
 *   par3d     : PAR3D answer (ours)
 *
 * VIEW values are null until captured with the pose picker.
 */

export const POINTCLOUD_BASE_QA = "assets/pointclouds/qa/";

export const qaExamples = [
  {
    id: "qa_1",
    cloud: "qa1.ply",
    dataset: "ScanQA",
    view: {
      "position": [
        0.543,
        -0.465,
        2.319
      ],
      "target": [
        0.349,
        0.929,
        1.802
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 50
    },
    pointSize: 0.02,
    question: "Where is the tv on the wall?",
    gt: "Above thin brown wooden table.",
    llava: "Above kitchen counter.",
    par3d: "Above the wooden table.",
  },
  {
    id: "qa_2",
    cloud: "qa2.ply",
    dataset: "ScanQA",
    view: {
      "position": [
        0.469,
        -0.138,
        3.4
      ],
      "target": [
        -0.656,
        0.51,
        2.067
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 50
    },
    pointSize: 0.02,
    question: "Where is the shelf located?",
    gt: "To left of brown rectangular door.",
    llava: "Behind couch.",
    par3d: "To left of door.",
  },
  {
    id: "qa_3",
    cloud: "qa3.ply",
    dataset: "ScanQA",
    "view": {
      "position": [
        0.367,
        0.125,
        2.541
      ],
      "target": [
        1.203,
        0.638,
        1.64
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 50
    },
    "pointSize": 0.016,
    question: "How many legs does the office chair have?",
    gt: "5 legs.",
    llava: "4.",
    par3d: "5.",
  },
  {
    id: "qa_4",
    cloud: "qa4.ply",
    dataset: "ScenePart-QA",
    "view": {
      "position": [
        2.367,
        -0.197,
        4.95
      ],
      "target": [
        0.524,
        -0.19,
        1.141
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 50
    },
    "pointSize": 0.02,
    question: "How many objects in the scene have seats?",
    gt: "8.",
    llava: "3.",
    par3d: "7.",
  },
  {
    id: "qa_5",
    cloud: "qa5.ply",
    dataset: "ScanQA",
    "view": {
      "position": [
        -0.383,
        1.267,
        2.737
      ],
      "target": [
        0.52,
        -0.186,
        1.569
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 55
    },
    "pointSize": 0.02,
    question: "What is located across from a vending machine?",
    gt: "Door.",
    llava: "Trash can.",
    par3d: "Door.",
  },
  {
    id: "qa_6",
    cloud: "qa6.ply",
    dataset: "ScenePart-QA",
    "view": {
      "position": [
        -1.747,
        -0.172,
        3.288
      ],
      "target": [
        0.096,
        0.84,
        1.919
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 40
    },
    "pointSize": 0.02,
    question: "What color is the armrest of the blue and brown chair?",
    gt: "Gray.",
    llava: "Brown.",
    par3d: "Gray.",
  },
];

/*
 * Configuration for the interactive referring-segmentation figure
 * (expt_more_refer).
 *
 * Each row is one scene shown across four columns in this fixed order:
 *   input -> Input Scene, gt -> Ground Truth, ours -> PAR3D, llava -> 3D-LLaVA.
 * The blue target mask is already baked into each cloud's per-point colors, so
 * no separate mask data is needed. All four cells in a row share a syncGroup,
 * so dragging one mirrors the camera to the others after the drag ends.
 *
 * view/pointSize are shared per row (the four columns are the same geometry
 * and viewpoint). view is null until captured with the pose picker; until then
 * each row auto-frames.
 */

export const POINTCLOUD_BASE_REFER = "assets/pointclouds/refer/";

export const REFER_COLUMNS = [
  { role: "input", label: "Input Scene" },
  { role: "gt", label: "Ground Truth" },
  { role: "ours", label: "PAR3D" },
  { role: "llava", label: "3D-LLaVA" },
];

export const referExamples = [
  {
    id: "refer_1",
    row: 1,
    dataset: "Multi3DRefer",
    "view": {
      "position": [
        -0.43,
        -0.629,
        2.429
      ],
      "target": [
        -0.301,
        0.754,
        1.049
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 50
    },
    "pointSize": 0.014,
    prompt:
      "The printer is located under the left window, at the left end of a gray cabinet in the corner.",
  },
  {
    id: "refer_2",
    row: 2,
    dataset: "Multi3DRefer",
    "view": {
      "position": [
        0.339,
        -1.139,
        2.207
      ],
      "target": [
        -0.069,
        -0.1,
        0.804
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 50
    },
    pointSize: 0.012,
    prompt: "Hanging to the right, a towel awaits its next use.",
  },
  {
    id: "refer_3",
    row: 3,
    dataset: "Multi3DRefer",
    "view": {
      "position": [
        1.157,
        0.542,
        1.729
      ],
      "target": [
        0.13,
        -0.206,
        1.503
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 50
    },
    pointSize: 0.014,
    prompt:
      "On top of the brown sideboard next to the window, there are grey computer monitors.",
  },
  {
    id: "refer_4",
    row: 4,
    dataset: "ScanRefer",
    "view": {
      "position": [
        0.194,
        -0.936,
        4.348
      ],
      "target": [
        0.447,
        -0.688,
        1.26
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 50
    },
    pointSize: 0.016,
    prompt:
      "A black office chair is sitting under the desk. there is a computer mouse in front of it.",
  },
  {
    id: "refer_5",
    row: 5,
    dataset: "ScanRefer",
    "view": {
      "position": [
        0.564,
        2.353,
        4.158
      ],
      "target": [
        0.329,
        -0.006,
        1.158
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 50
    },
    pointSize: 0.02,
    prompt:
      "The radiator is grey and below the window. the radiator is at the end of the table.",
  },
  {
    id: "refer_6",
    row: 6,
    dataset: "ScenePart-Seg",
    "view": {
      "position": [
        2.832,
        -1.68,
        2.223
      ],
      "target": [
        0.67,
        -0.823,
        0.23
      ],
      "up": [
        0,
        0,
        1
      ],
      "fov": 56
    },
    pointSize: 0.02,
    prompt: "Locate the pillow on the Red and white modern sofa.",
  },
];
