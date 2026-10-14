const evaluationRecipient = "dweik0607@gmail.com";
const evaluationCc = "jinrui.han@connect.hku.hk";

function evaluationDraft(form) {
  const values = new FormData(form);
  const value = (name) => String(values.get(name) || "").trim();
  const components = {
    policy: "Policy",
    controller: "Controller",
    pair: "Policy–controller pair",
  };
  const subject = `LocoManiLab simulation evaluation request — ${value("model")}`;
  const body = [
    "Hello LocoManiLab team,",
    "",
    "I would like to request a simulation evaluation in LocoManiLab.",
    "",
    `Name: ${value("name")}`,
    `Email: ${value("email")}`,
    `Affiliation: ${value("affiliation")}`,
    `WeChat: ${value("wechat") || "Not provided"}`,
    `Component: ${components[value("component")] || "Policy"}`,
    `Policy / controller: ${value("model")}`,
    "Evaluation environment: Simulation",
    `Project / model URL: ${value("url") || "Not provided"}`,
    "",
    "Additional details:",
    value("notes") || "Not provided",
  ].join("\n");
  const href = `mailto:${evaluationRecipient}?cc=${encodeURIComponent(evaluationCc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const text = [
    `To: ${evaluationRecipient}`,
    `Cc: ${evaluationCc}`,
    `Subject: ${subject}`,
    "",
    body,
  ].join("\n");
  return { href, text };
}

export function enhanceCommunity(root = document) {
  const form = root.querySelector("#evaluation-form");
  if (!form || form.dataset.enhanced === "true") return;
  form.dataset.enhanced = "true";

  const status = root.querySelector("#evaluation-status");
  const copyButton = root.querySelector("#copy-evaluation");
  const mailLink = root.querySelector("#evaluation-mailto");
  form.querySelector('button[type="submit"]').disabled = false;
  if (copyButton) copyButton.disabled = false;
  const setStatus = (message) => {
    if (status) status.textContent = message;
  };
  const updateMailLink = () => {
    const draft = evaluationDraft(form);
    if (mailLink) mailLink.href = draft.href;
    return draft;
  };

  form.addEventListener("input", () => {
    updateMailLink();
    setStatus("");
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const draft = updateMailLink();
    setStatus(
      "Your simulation evaluation draft is ready. Send it from your email app to make the request. If no email app opens, use Copy details and email it to dweik0607@gmail.com.",
    );
    window.location.href = draft.href;
  });

  copyButton?.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const draft = updateMailLink();
    try {
      await navigator.clipboard.writeText(draft.text);
      setStatus(
        "Draft copied. Paste it into your email app and send it to request simulation evaluation.",
      );
    } catch {
      setStatus(
        "The draft could not be copied. Use Prepare email, or email your request to dweik0607@gmail.com and cc jinrui.han@connect.hku.hk.",
      );
    }
  });

  updateMailLink();
}

enhanceCommunity();
