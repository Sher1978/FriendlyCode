import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'dart:typed_data';

class ImageUploadWidget extends StatefulWidget {
  final String? initialUrl;
  final Function(String) onUploadComplete;
  final String label;
  final String? path;

  const ImageUploadWidget({
    super.key, 
    this.initialUrl, 
    required this.onUploadComplete, 
    this.label = "Upload Image",
    this.path,
  });

  @override
  State<ImageUploadWidget> createState() => _ImageUploadWidgetState();
}

class _ImageUploadWidgetState extends State<ImageUploadWidget> {
  String? _previewUrl;
  bool _isUploading = false;
  final ImagePicker _picker = ImagePicker();

  Future<void> _pickAndUpload() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image == null) return;

      setState(() => _isUploading = true);

      // Read bytes for web/mobile compatibility
      Uint8List data = await image.readAsBytes();

      // Determine path
      final String fileName = "${DateTime.now().millisecondsSinceEpoch}_${image.name}";
      final String uploadPath = widget.path != null 
          ? "${widget.path}/$fileName"
          : "uploads/$fileName";
      
      final Reference ref = FirebaseStorage.instance.ref().child(uploadPath);

      // Metadata with fallback
      final metadata = SettableMetadata(
        contentType: image.mimeType ?? 'image/jpeg', // Default to jpeg if unknown
        customMetadata: {'picked-file-path': image.path},
      );

      // Upload
      final UploadTask uploadTask = ref.putData(data, metadata);
      
      // Monitor Progress (Optional, could add stream listener here)
      
      final TaskSnapshot snapshot = await uploadTask;
      final String downloadUrl = await snapshot.ref.getDownloadURL();

      setState(() {
        _previewUrl = downloadUrl;
        _isUploading = false;
      });

      widget.onUploadComplete(downloadUrl);
    } catch (e) {
      debugPrint("Image Upload Error: $e");
      setState(() => _isUploading = false);
      if (mounted) {
        String errorMsg = "Upload failed: $e";
        if (e.toString().contains("xmlhttprequest")) {
           errorMsg = "CORS Error: Please configure CORS on your Firebase Storage bucket via Google Cloud Console.";
        } else if (e.toString().contains("unauthorized")) {
           errorMsg = "Permission Denied: Check Firebase Storage Rules.";
        }
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(errorMsg), 
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.body)),
        const SizedBox(height: 8),
        InkWell(
          onTap: _isUploading ? null : _pickAndUpload,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            height: 150,
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.title.withValues(alpha: 0.1)),
              image: _previewUrl != null 
                ? DecorationImage(image: NetworkImage(_previewUrl!), fit: BoxFit.cover)
                : null,
            ),
            child: _isUploading 
              ? const Center(child: CircularProgressIndicator())
              : _previewUrl == null 
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.cloud_upload_outlined, size: 32, color: AppColors.accentOrange),
                      SizedBox(height: 8),
                      Text("Click to Upload", style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold)),
                    ],
                  )
                : Container(
                    alignment: Alignment.topRight,
                    padding: const EdgeInsets.all(8),
                    child: CircleAvatar(
                      backgroundColor: Colors.black54,
                      radius: 16,
                      child: IconButton(
                        icon: const Icon(Icons.edit, size: 16, color: Colors.white),
                        onPressed: _pickAndUpload,
                      ),
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}
