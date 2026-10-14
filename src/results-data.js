// Author-supplied tables, 2026-10-09. Display reported averages without recomputing.
export const resultTables = {
  generalization: {
    title: "Policy generalization",
    caption: "Success rate (%) · SONIC · no domain randomization",
    scope: "234 evaluation tasks · averages weight tasks equally",
    rowLabel: "Policy",
    source: "./media/results/table-generalization.png",
    groups: [
      {
        name: "Seen task",
        labels: ["Atomic", "Compositional", "Average"],
        counts: [50, 50, 100],
      },
      {
        name: "Unseen task",
        labels: ["Atomic", "Compositional", "Average"],
        counts: [52, 71, 123],
      },
      {
        name: "Unseen scene",
        labels: ["Atomic", "Compositional", "Average"],
        counts: [6, 5, 11],
      },
      { name: "Overall", labels: ["Average"], counts: [234] },
    ],
    rows: [
      ["XR-1", [84.3, 72.5, 78.4, 21.7, 27.9, 25.3, 0.0, 18.0, 8.2, 47.2]],
      ["π₀.₅", [84.9, 48.4, 66.7, 11.2, 14.8, 13.3, 1.7, 24.0, 11.8, 36.0]],
      [
        "GR00T N1.7",
        [81.4, 50.2, 65.8, 10.0, 12.7, 11.5, 1.7, 12.0, 6.4, 34.5],
      ],
      [
        "InternVLA-A1.5",
        [68.8, 38.0, 53.4, 10.2, 10.7, 10.5, 0.0, 18.0, 8.2, 28.7],
      ],
      ["SmolVLA", [74.6, 14.9, 44.8, 6.0, 2.7, 4.1, 1.7, 6.0, 3.6, 21.4]],
      ["PRTS", [36.6, 32.5, 34.6, 2.9, 7.7, 5.7, 1.7, 4.0, 2.7, 17.9]],
      ["Ψ₀", [54.4, 8.9, 31.7, 6.9, 2.0, 4.1, 0.0, 0.0, 0.0, 15.7]],
      ["StarVLA-α", [48.3, 12.8, 30.6, 6.0, 1.3, 3.3, 5.0, 0.0, 2.7, 14.9]],
      ["X-VLA", [54.1, 5.4, 29.8, 4.6, 3.1, 3.7, 1.7, 4.0, 2.7, 14.8]],
      [
        "Diffusion Policy",
        [27.1, 1.8, 14.5, 3.7, 0.0, 1.5, 0.0, 0.0, 0.0, 7.0],
      ],
      ["Fast-WAM", [10.1, 1.1, 5.6, 4.2, 1.1, 2.4, 1.7, 0.0, 0.9, 3.7]],
      ["DreamZero", [9.3, 0.2, 4.8, 4.4, 0.8, 2.4, 0.0, 0.0, 0.0, 3.3]],
    ],
  },
  robustness: {
    title: "Robustness to domain randomization",
    caption: "Seen-task success rate (%) · three randomization levels",
    scope: "100 seen tasks · 51 atomic + 49 compositional per level",
    rowLabel: "Policy",
    source: "./media/results/table-robustness.png",
    groups: [
      { name: "Atomic", labels: ["Low", "Mid", "High"], counts: [51, 51, 51] },
      {
        name: "Compositional",
        labels: ["Low", "Mid", "High"],
        counts: [49, 49, 49],
      },
      { name: "Overall", labels: ["Average"], counts: [100] },
    ],
    rows: [
      ["XR-1", [88.8, 83.8, 68.4, 68.6, 56.0, 39.2, 67.7]],
      ["π₀.₅", [81.6, 80.2, 77.5, 42.9, 38.6, 31.1, 59.1]],
      ["GR00T N1.7", [79.5, 74.3, 58.4, 43.1, 37.8, 19.2, 52.4]],
      ["InternVLA-A1.5", [66.0, 63.7, 60.1, 30.8, 26.9, 22.2, 45.3]],
      ["SmolVLA", [67.6, 66.8, 57.5, 13.9, 11.4, 7.8, 38.0]],
      ["Ψ₀", [46.4, 42.0, 37.4, 8.2, 5.8, 4.8, 24.4]],
      ["StarVLA-α", [40.4, 32.0, 25.0, 11.0, 8.7, 2.9, 20.2]],
      ["PRTS", [35.1, 35.9, 31.4, 3.7, 3.4, 2.4, 18.3]],
      ["X-VLA", [38.3, 32.1, 27.5, 2.1, 2.4, 1.7, 17.7]],
      ["Diffusion Policy", [9.6, 10.2, 9.4, 0.2, 0.1, 0.0, 5.0]],
      ["DreamZero", [8.2, 8.0, 11.3, 0.2, 0.0, 0.3, 4.8]],
      ["Fast-WAM", [3.8, 3.1, 2.9, 1.6, 1.7, 2.2, 2.6]],
    ],
  },
  sources: {
    title: "Training-data source ablation",
    caption: "Success rate (%) · SONIC · equal task weighting",
    scope: "20 tasks · 16 atomic + 4 compositional · two policies",
    rowLabel: "Training data",
    source: "./media/results/table-data-sources.png",
    bestOnly: true,
    groups: [
      {
        name: "GR00T",
        labels: ["Atomic", "Compositional", "All"],
        counts: [16, 4, 20],
      },
      {
        name: "π₀.₅",
        labels: ["Atomic", "Compositional", "All"],
        counts: [16, 4, 20],
      },
    ],
    rows: [
      ["Teleoperation only", [88.4, 56.2, 82.0, 92.5, 76.2, 89.2]],
      ["Motion synthesis only", [40.9, 22.5, 37.2, 46.9, 20.0, 41.5]],
      ["Data augmentation only", [66.9, 23.8, 58.2, 63.7, 3.8, 51.7]],
      ["Teleop. + synthesis", [73.8, 63.7, 71.8, 88.1, 73.8, 85.2]],
      ["Teleop. + augmentation", [85.9, 68.8, 82.5, 90.3, 63.7, 85.0]],
      ["All three", [46.9, 43.8, 46.2, 90.3, 63.7, 85.0]],
    ],
  },
};
