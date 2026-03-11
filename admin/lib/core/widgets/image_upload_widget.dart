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
  double _uploadProgress = 0;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _previewUrl = widget.initialUrl;
  }

  @override
  void didUpdateWidget(ImageUploadWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialUrl != oldWidget.initialUrl) {
      setState(() {
        _previewUrl = widget.initialUrl;
      });
    }
  }

  Future<void> _pickAndUpload() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image == null) return;

      setState(() {
        _isUploading = true;
        _uploadProgress = 0;
      });

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
        contentType: image.mimeType ?? 'image/jpeg',
        customMetadata: {'picked-file-path': image.path},
      );

      // Upload
      final UploadTask uploadTask = ref.putData(data, metadata);
      
      // Monitor Progress
      uploadTask.snapshotEvents.listen((TaskSnapshot snapshot) {
        if (snapshot.totalBytes > 0) {
          setState(() {
            _uploadProgress = snapshot.bytesTransferred / snapshot.totalBytes;
          });
        }
      });
      
      final TaskSnapshot snapshot = await uploadTask;
      final String downloadUrl = await snapshot.ref.getDownloadURL();

      if (mounted) {
        setState(() {
          _previewUrl = downloadUrl;
          _isUploading = false;
        });
        widget.onUploadComplete(downloadUrl);
      }
    } catch (e) {
      debugPrint("Image Upload Error: $e");
      if (mounted) {
        setState(() => _isUploading = false);
        String errorMsg = "Upload failed. Please check your connection.";
        if (e.toString().contains("xmlhttprequest")) {
           errorMsg = "Browser CORS Error: Storage bucket needs CORS configuration.";
        } else if (e.toString().contains("unauthorized")) {
           errorMsg = "Permission Denied: Firebase Storage rules error.";
        } else if (e.toString().contains("canceled")) {
           errorMsg = "Upload canceled.";
        }
        
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(errorMsg), 
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
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
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.title.withOpacity(0.1)),
              image: _previewUrl != null && !_isUploading
                ? DecorationImage(image: NetworkImage(_previewUrl!), fit: BoxFit.cover)
                : null,
            ),
            child: _isUploading 
              ? Stack(
                  alignment: Alignment.center,
                  children: [
                    const CircularProgressIndicator(color: AppColors.accentOrange),
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: LinearProgressIndicator(
                        value: _uploadProgress,
                        backgroundColor: Colors.transparent,
                        color: AppColors.accentOrange.withOpacity(0.5),
                        minHeight: 4,
                      ),
                    ),
                    Text(
                      "${(_uploadProgress * 100).toInt()}%",
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.title),
                    ),
                  ],
                )
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
