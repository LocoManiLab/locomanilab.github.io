// Project attribution is checked against the linked authors' project pages.
// Logo source URLs and hashes are recorded in institution-provenance.json.
export const organizations = {
  teleai: { name: "TeleAI, China Telecom", logo: "teleai.webp" },
  tsinghua: { name: "Tsinghua University", logo: "tsinghua.webp" },
  cuhk: { name: "The Chinese University of Hong Kong", logo: "cuhk.webp" },
  hkust: {
    name: "Hong Kong University of Science and Technology",
    logo: "hkust-mark.svg",
  },
  peking: { name: "Peking University", logo: "peking.webp" },
  pi: { name: "Physical Intelligence", logo: "physical-intelligence.webp" },
  nvidia: { name: "NVIDIA", logo: "nvidia.webp" },
  xiaomi: { name: "Xiaomi Robotics", logo: "xiaomi.png" },
  ailab: { name: "Shanghai AI Laboratory", logo: "shanghai-ai-lab.webp" },
  psi: { name: "USC Physical Superintelligence Lab", logo: "psi-lab.svg" },
  huggingface: { name: "Hugging Face", logo: "huggingface.svg" },
  columbia: { name: "Columbia Engineering", logo: "columbia-mark.svg" },
  mit: { name: "MIT", logo: "mit.svg" },
  tri: { name: "Toyota Research Institute", logo: "tri.svg" },
  ucsd: { name: "UC San Diego", logo: "ucsd.webp" },
  dexmal: { name: "Dexmal", logo: "dexmal.jpg" },
};

export const policyProfiles = [
  {
    name: "DM0.5",
    url: "https://github.com/dexmal/opendm",
    organizations: ["dexmal"],
    affiliation: "Dexmal",
  },
  {
    name: "StarVLA-α",
    url: "https://github.com/starVLA/starVLA-alpha",
    organizations: ["hkust", "cuhk", "tsinghua"],
    affiliation: "HKUST + collaborators",
  },
  {
    name: "PRTS",
    url: "https://rhodes-team-prts.github.io/",
    organizations: ["teleai", "tsinghua"],
    affiliation: "TeleAI · Tsinghua + collaborators",
  },
  {
    name: "π₀.₅",
    url: "https://pi.website/blog/pi0.5",
    organizations: ["pi"],
    affiliation: "Physical Intelligence",
  },
  {
    name: "GR00T N1.7",
    url: "https://huggingface.co/nvidia/GR00T-N1.7-3B",
    organizations: ["nvidia"],
    affiliation: "NVIDIA",
  },
  {
    name: "XR-1",
    url: "https://robotics.xiaomi.com/xiaomi-robotics-1.html",
    organizations: ["xiaomi"],
    affiliation: "Xiaomi Robotics",
  },
  {
    name: "InternVLA-A1.5",
    url: "https://internrobotics.github.io/internvla-a15.github.io/",
    organizations: ["ailab"],
    affiliation: "Shanghai AI Laboratory",
  },
  {
    name: "Ψ₀",
    url: "https://psi-lab.ai/Psi0/",
    organizations: ["psi", "nvidia"],
    affiliation: "USC PSI Lab · NVIDIA · World Engine",
  },
  {
    name: "X-VLA",
    url: "https://thu-air-dream.github.io/X-VLA/",
    organizations: ["tsinghua", "peking"],
    affiliation: "AIR, Tsinghua · Peking",
  },
  {
    name: "SmolVLA",
    url: "https://huggingface.co/blog/smolvla",
    organizations: ["huggingface"],
    affiliation: "Hugging Face + collaborators",
  },
  {
    name: "Diffusion Policy",
    url: "https://diffusion-policy.cs.columbia.edu/",
    organizations: ["columbia", "mit", "tri"],
    affiliation: "Columbia · MIT · Toyota Research Institute",
  },
  {
    name: "Fast-WAM",
    url: "https://yuantianyuan01.github.io/FastWAM/",
    organizations: ["tsinghua"],
    affiliation: "Tsinghua · Galaxea AI",
  },
];

export const controllerProfiles = {
  sonic: {
    url: "https://nvlabs.github.io/SONIC/",
    organizations: ["nvidia"],
    affiliation: "NVIDIA + collaborators",
  },
  amo: {
    url: "https://amo-humanoid.github.io/",
    organizations: ["ucsd"],
    affiliation: "UC San Diego",
  },
  heft: {
    url: "https://heft.axell.top/",
    organizations: ["tsinghua"],
    affiliation: "Tsinghua · RobotEra · Shanghai Qizhi Institute",
  },
  almi: {
    url: "https://almi-humanoid.github.io/",
    organizations: ["teleai"],
    affiliation: "TeleAI + collaborators",
  },
  scalebfm: {
    url: "https://scalebfm.github.io/",
    organizations: ["ailab"],
    affiliation: "Shanghai AI Laboratory + collaborators",
  },
};

export function organizationLogos(ids) {
  return ids
    .map((id) => {
      const organization = organizations[id];
      return `<span class="organization-mark" data-organization="${id}"><img src="./media/institutions/${organization.logo}" alt="${organization.name}" width="40" height="40" loading="lazy" /></span>`;
    })
    .join("");
}

// Use the same first listed institution in the library and every leaderboard.
export function policyLogo(policy) {
  return organizationLogos(policy.organizations.slice(0, 1));
}
