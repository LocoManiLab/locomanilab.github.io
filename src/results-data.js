// Author-supplied tables, 2026-10-17. Display reported averages without recomputing.
export const resultTables = {
  generalization: {
    title: "Policy generalization",
    caption: "Success rate (%) · SONIC · no domain randomization",
    scope: "234 evaluation tasks · averages weight tasks equally",
    rowLabel: "Policy",
    source: "./media/results/paper-20261017/table2_main_results/summary.csv",
    perTaskSource:
      "./media/results/paper-20261017/table2_main_results/per_task.csv",
    groups: [
      {
        name: "Seen task",
        labels: ["Atomic", "Compositional", "Average"],
        counts: [50, 50, 100],
      },
      {
        name: "Unseen task",
        labels: ["Atomic", "Compositional", "Average"],
        counts: [46, 77, 123],
      },
      {
        name: "Unseen scene",
        labels: ["Atomic", "Compositional", "Average"],
        counts: [6, 5, 11],
      },
      {
        name: "Overall",
        labels: ["Average"],
        counts: [234],
      },
    ],
    rows: [
      ["XR-1", [85.2, 75.1, 80.2, 23.7, 26.1, 25.2, 0.0, 18.0, 8.2, 47.9]],
      ["DM0.5", [90.1, 65.7, 77.9, 16.3, 16.8, 16.6, 0.0, 34.0, 15.5, 42.7]],
      ["π₀.₅", [84.4, 51.0, 67.7, 12.6, 13.6, 13.3, 1.7, 24.0, 11.8, 36.5]],
      [
        "GR00T N1.7",
        [82.3, 54.1, 68.2, 11.3, 11.7, 11.5, 1.7, 12.0, 6.4, 35.5],
      ],
      [
        "InternVLA-A1.5",
        [70.7, 36.7, 53.7, 11.5, 9.9, 10.5, 0.0, 18.0, 8.2, 28.8],
      ],
      ["SmolVLA", [73.9, 17.4, 45.7, 6.7, 2.5, 4.1, 1.7, 6.0, 3.6, 21.8]],
      ["Fast-WAM", [52.8, 28.6, 40.7, 7.8, 4.2, 5.5, 1.7, 4.0, 2.7, 20.4]],
      ["PRTS", [37.0, 34.3, 35.7, 3.5, 7.0, 5.7, 1.7, 4.0, 2.7, 18.4]],
      ["Ψ₀", [55.1, 9.0, 32.1, 8.0, 1.7, 4.1, 0.0, 0.0, 0.0, 15.8]],
      ["X-VLA", [54.5, 6.0, 30.3, 5.2, 2.9, 3.7, 1.7, 4.0, 2.7, 15.0]],
      ["StarVLA-α", [47.6, 13.5, 30.6, 6.7, 1.2, 3.3, 5.0, 0.0, 2.7, 14.9]],
      [
        "Diffusion Policy",
        [27.6, 1.8, 14.7, 4.1, 0.0, 1.5, 0.0, 0.0, 0.0, 7.1],
      ],
    ],
  },
  robustness: {
    title: "Robustness to domain randomization",
    caption: "Seen-task success rate (%) · three randomization levels",
    scope: "100 seen tasks · 50 atomic + 50 compositional per level",
    rowLabel: "Policy",
    source:
      "./media/results/paper-20261017/table3_domain_randomization/summary.csv",
    perTaskSource:
      "./media/results/paper-20261017/table3_domain_randomization/per_task.csv",
    groups: [
      {
        name: "Atomic",
        labels: ["Low", "Mid", "High"],
        counts: [50, 50, 50],
      },
      {
        name: "Compositional",
        labels: ["Low", "Mid", "High"],
        counts: [50, 50, 50],
      },
      {
        name: "Overall",
        labels: ["Average"],
        counts: [100],
      },
    ],
    rows: [
      ["DM0.5", [89.3, 86.9, 83.0, 60.8, 58.5, 42.5, 70.2]],
      ["XR-1", [90.0, 85.4, 70.5, 71.1, 57.7, 39.5, 69.0]],
      ["π₀.₅", [83.5, 81.7, 78.8, 44.1, 40.7, 34.1, 60.5]],
      ["GR00T N1.7", [80.1, 75.3, 59.8, 47.6, 41.6, 20.7, 54.2]],
      ["InternVLA-A1.5", [67.5, 65.4, 61.6, 31.2, 27.2, 22.1, 45.8]],
      ["SmolVLA", [68.5, 66.9, 58.0, 15.7, 13.5, 8.9, 38.6]],
      ["Ψ₀", [48.3, 43.4, 38.4, 8.1, 6.0, 4.8, 24.8]],
      ["Fast-WAM", [36.7, 28.8, 28.0, 19.4, 15.2, 15.2, 23.9]],
      ["StarVLA-α", [41.2, 32.7, 25.4, 11.0, 9.0, 3.0, 20.4]],
      ["PRTS", [30.9, 36.3, 32.3, 4.1, 3.6, 2.4, 18.3]],
      ["X-VLA", [39.4, 32.7, 27.9, 2.1, 2.4, 1.9, 17.7]],
      ["Diffusion Policy", [10.0, 10.5, 9.7, 0.2, 0.1, 0.0, 5.1]],
    ],
  },
  sources: {
    title: "Training-data source ablation",
    caption: "Success rate (%) · SONIC · equal task weighting",
    scope: "20 tasks · 16 atomic + 4 compositional · two policies",
    rowLabel: "Training data",
    source: "./media/results/paper-20261017/table4_data_source/summary.csv",
    perTaskSource:
      "./media/results/paper-20261017/table4_data_source/per_task.csv",
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
      ["All three", [46.9, 43.8, 46.2, 89.7, 63.7, 84.5]],
    ],
  },
};
