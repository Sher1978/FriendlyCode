
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:friendly_code/core/models/venue_stats_model.dart';

class PdfGeneratorService {
  Future<void> generateAndShareReport(String venueName, List<DailyStats> stats) async {
    final doc = pw.Document();

    // Load custom font if needed, using standard for now
    final font = await PdfGoogleFonts.nunitoExtraLight();
    
    // Process Data for textual summary
    int totalVisits = stats.fold(0, (sum, item) => sum + item.totalVisits);
    int newUsers = stats.fold(0, (sum, item) => sum + item.newActivations);

    doc.addPage(
      pw.Page(
        pageTheme: pw.PageTheme(
          theme: pw.ThemeData.withFont(base: font),
          buildBackground: (context) => pw.FullPage(
            ignoreMargins: true,
            child: pw.Container(color: PdfColors.white),
          ),
        ),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Header(
                level: 0,
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text("Friendly Code", style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold, color: PdfColors.orange)),
                    pw.Text("Performance Report", style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),
              
              // Meta Info
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text("Venue: $venueName"),
                  pw.Text("Date: ${DateTime.now().toString().split(' ')[0]}"),
                ],
              ),
              pw.Divider(),
              pw.SizedBox(height: 20),

              // KPI Summary
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
                children: [
                  _buildKpiBox("Total Activations", "$totalVisits"),
                  _buildKpiBox("New Guests", "$newUsers"),
                  _buildKpiBox("Retention Rate", "18.5%"), // Mocked for now
                ],
              ),
              pw.SizedBox(height: 40),

              // Charts Placeholder
              // Rendering actual fl_charts to PDF is complex (requires screenshotting). 
              // For MVP/Robustness, we use a simplified representation or placeholder text/shapes.
              pw.Text("Visit Velocity Trend", style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 10),
              pw.Container(
                height: 150,
                width: double.infinity,
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.grey300),
                  borderRadius: pw.BorderRadius.circular(8),
                  color: PdfColors.grey100,
                ),
                child: pw.Center(child: pw.Text("Chart visualization available in Dashboard")),
              ),
              
              pw.SizedBox(height: 20),

              pw.Text("Detailed Breakdown", style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
              pw.Table.fromTextArray(
                context: context,
                data: <List<String>>[
                  <String>['Date', 'Visits', 'New Guests', 'Status'],
                  ...stats.take(10).map((s) => [s.date, s.totalVisits.toString(), s.newActivations.toString(), 'Active']),
                ],
              ),
              
              pw.Spacer(),
              pw.Center(
                child: pw.Text("Powered by Friendly Code", style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey)),
              ),
            ],
          );
        },
      ),
    );

    // Share directly
    await Printing.sharePdf(bytes: await doc.save(), filename: 'report_${venueName.replaceAll(' ', '_')}.pdf');
  }

  pw.Widget _buildKpiBox(String label, String value) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: PdfColors.grey),
        borderRadius: pw.BorderRadius.circular(4),
      ),
      child: pw.Column(
        children: [
          pw.Text(value, style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold, color: PdfColors.orange)),
          pw.Text(label, style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey)),
        ],
      ),
    );
  }
}
