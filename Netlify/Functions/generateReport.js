import PDFDocument from "pdfkit";

export async function handler(event) {
  try {
    const { lead, audit, results } = JSON.parse(event.body);

    const doc = new PDFDocument();
    let chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {});

    // Cover Page
    doc.fontSize(22).text("AI Workflow Audit Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Prepared for: ${lead.name} (${lead.email})`, {
      align: "center",
    });
    doc.moveDown(2);

    // Audit Summary
    doc.fontSize(16).text("Business Summary");
    doc.fontSize(12).text(`Business Type: ${audit.bizType}`);
    doc.text(`Challenges: ${audit.challenges || "Not provided"}`);
    doc.moveDown();

    // Recommendations
    doc.fontSize(16).text("Top Recommendations");
    results.forEach((r) => {
      doc.moveDown();
      doc.fontSize(14).text(`${r.name} — ${r.role}`, { underline: true });
      doc.fontSize(12).text(r.why);
      doc.moveDown();

      doc.text("Setup:");
      r.setup.forEach((s) => doc.text(` • ${s}`));

      doc.text("Do’s:");
      r.dos.forEach((d) => doc.text(` ✔ ${d}`));

      doc.text("Don’ts:");
      r.donts.forEach((d) => doc.text(` ✖ ${d}`));

      doc.text("Use Cases:");
      r.useCases.forEach((u) => doc.text(` • ${u}`));
    });

    doc.end();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="AI-Audit-Report.pdf"',
      },
      body: Buffer.concat(chunks).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
