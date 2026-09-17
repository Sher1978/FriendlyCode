import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/widgets/image_upload_widget.dart';
import 'package:friendly_code/core/widgets/image_upload_widget.dart';
import 'package:flutter/services.dart';
import 'dart:ui';

class GoogleMapsConfigScreen extends StatefulWidget {
  final VenueModel venue;
  const GoogleMapsConfigScreen({super.key, required this.venue});

  @override
  State<GoogleMapsConfigScreen> createState() => _GoogleMapsConfigScreenState();
}

class _GoogleMapsConfigScreenState extends State<GoogleMapsConfigScreen> {
  final VenuesService _venuesService = VenuesService();
  late GoogleMapsConfig _gmConfig;
  bool _isSaving = false;

  late TextEditingController _dailyOfferTextCtrl;
  late TextEditingController _dailyOfferImageCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _instagramCtrl;
  late TextEditingController _tiktokCtrl;
  late TextEditingController _youtubeCtrl;
  late TextEditingController _telegramCtrl;
  late TextEditingController _whatsappCtrl;
  late TextEditingController _menuPdfUrlCtrl;

  @override
  void initState() {
    super.initState();
    _gmConfig = widget.venue.gmConfig;
    _dailyOfferTextCtrl = TextEditingController(text: _gmConfig.dailyOfferText);
    _dailyOfferImageCtrl = TextEditingController(text: _gmConfig.dailyOfferImageUrl);
    _phoneCtrl = TextEditingController(text: _gmConfig.phone);
    _instagramCtrl = TextEditingController(text: _gmConfig.instagram);
    _tiktokCtrl = TextEditingController(text: _gmConfig.tiktok);
    _youtubeCtrl = TextEditingController(text: _gmConfig.youtube);
    _telegramCtrl = TextEditingController(text: _gmConfig.telegram);
    _whatsappCtrl = TextEditingController(text: _gmConfig.whatsapp);
    _menuPdfUrlCtrl = TextEditingController(text: _gmConfig.menuPdfUrl);
  }

  @override
  void dispose() {
    _dailyOfferTextCtrl.dispose();
    _dailyOfferImageCtrl.dispose();
    _phoneCtrl.dispose();
    _instagramCtrl.dispose();
    _tiktokCtrl.dispose();
    _youtubeCtrl.dispose();
    _telegramCtrl.dispose();
    _whatsappCtrl.dispose();
    _menuPdfUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final updatedConfig = _gmConfig.copyWith(
        dailyOfferText: _dailyOfferTextCtrl.text,
        dailyOfferImageUrl: _dailyOfferImageCtrl.text,
        phone: _phoneCtrl.text,
        instagram: _instagramCtrl.text,
        tiktok: _tiktokCtrl.text,
        youtube: _youtubeCtrl.text,
        telegram: _telegramCtrl.text,
        whatsapp: _whatsappCtrl.text,
        menuPdfUrl: _menuPdfUrlCtrl.text,
      );
      final updatedVenue = widget.venue.copyWith(gmConfig: updatedConfig);
      
      if (updatedVenue.id.isNotEmpty) {
        await _venuesService.updateVenue(updatedVenue);
      }
      
      if (mounted) {
        Navigator.pop(context, updatedConfig);
      }
    } catch (e) {
      debugPrint("Error saving Google Maps config: $e");
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _addMenuItem() {
    setState(() {
      _gmConfig = _gmConfig.copyWith(
        menuItems: [..._gmConfig.menuItems, GmMenuItem(name: 'Новый пункт', price: '0')],
      );
    });
  }

  void _removeMenuItem(int index) {
    setState(() {
      final items = List<GmMenuItem>.from(_gmConfig.menuItems);
      items.removeAt(index);
      _gmConfig = _gmConfig.copyWith(menuItems: items);
    });
  }

  void _addServiceItem() {
    setState(() {
      _gmConfig = _gmConfig.copyWith(
        services: [..._gmConfig.services, GmServiceItem(name: 'Новая услуга', price: '0', duration: '60 мин')],
      );
    });
  }

  void _removeServiceItem(int index) {
    setState(() {
      final items = List<GmServiceItem>.from(_gmConfig.services);
      items.removeAt(index);
      _gmConfig = _gmConfig.copyWith(services: items);
    });
  }

  void _showFullScreenImage(String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: EdgeInsets.zero,
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              panEnabled: true,
              minScale: 0.5,
              maxScale: 4,
              child: Image.network(url, fit: BoxFit.contain),
            ),
            Positioned(
              top: 40,
              right: 20,
              child: CupertinoButton(
                padding: EdgeInsets.zero,
                color: Colors.black54,
                borderRadius: BorderRadius.circular(30),
                child: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text("Google Maps Pre-Landing", style: TextStyle(color: Colors.white, fontSize: 16)),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isSaving 
          ? const Center(child: CupertinoActivityIndicator(radius: 12))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 800),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildGlassSection(
                      title: "ТИП БИЗНЕСА (КАТЕГОРИЯ)",
                      children: [
                        const Text(
                          "Выберите, как будет отображаться контент на странице.",
                          style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                        ),
                        const SizedBox(height: 12),
                        CupertinoSegmentedControl<String>(
                          children: const {
                            'horeca': Padding(padding: EdgeInsets.all(8.0), child: Text("HoReCa (Меню)")),
                            'services': Padding(padding: EdgeInsets.all(8.0), child: Text("Услуги (Прайс-лист)")),
                          },
                          groupValue: _gmConfig.businessType,
                          onValueChanged: (val) {
                            setState(() {
                              _gmConfig = _gmConfig.copyWith(businessType: val);
                            });
                          },
                          selectedColor: AppColors.accentOrange,
                          borderColor: AppColors.accentOrange,
                          unselectedColor: Colors.transparent,
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    _buildGlassSection(
                      title: "ССЫЛКА ДЛЯ GOOGLE КАРТ",
                      children: [
                        const Text(
                          "Скопируйте эту ссылку и добавьте в профиль Google Business. Все переходы по ней будут вести на пре-лендинг.",
                          style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.macosDivider),
                                ),
                                child: Text(
                                  "https://www.revoo.win/?utm_source=google_maps&id=${widget.venue.id}",
                                  style: const TextStyle(color: Colors.white, fontSize: 14),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            CupertinoButton(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              color: AppColors.accentOrange,
                              borderRadius: BorderRadius.circular(8),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: "https://www.revoo.win/?utm_source=google_maps&id=${widget.venue.id}"));
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Ссылка скопирована!"), backgroundColor: Colors.green));
                              },
                              child: const Icon(CupertinoIcons.doc_on_doc, color: Colors.white, size: 20),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    _buildGlassSection(
                      title: "КОНТАКТЫ И СОЦСЕТИ",
                      children: [
                        _buildCupertinoField("Телефон / WhatsApp", _phoneCtrl, placeholder: "+7 999 123 45 67"),
                        _buildCupertinoField("Instagram", _instagramCtrl, placeholder: "https://instagram.com/..."),
                        _buildCupertinoField("TikTok", _tiktokCtrl, placeholder: "https://tiktok.com/..."),
                        _buildCupertinoField("YouTube", _youtubeCtrl, placeholder: "https://youtube.com/..."),
                        _buildCupertinoField("Telegram", _telegramCtrl, placeholder: "https://t.me/..."),
                        _buildCupertinoField("WhatsApp (Прямая ссылка)", _whatsappCtrl, placeholder: "https://wa.me/..."),
                      ],
                    ),
                    const SizedBox(height: 32),
                    _buildGlassSection(
                      title: "ЕЖЕДНЕВНЫЙ ОФФЕР",
                      children: [
                        _buildCupertinoField("Текст оффера (описание товара дня)", _dailyOfferTextCtrl, maxLines: 2, placeholder: "Например: Капучино и круассан по спеццене"),
                        _buildCupertinoField("Ссылка на фото оффера (URL)", _dailyOfferImageCtrl, placeholder: "https://..."),
                        if (_dailyOfferImageCtrl.text.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 20),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(_dailyOfferImageCtrl.text, height: 100, width: 100, fit: BoxFit.cover,
                                errorBuilder: (c, e, s) => const Icon(Icons.broken_image, color: Colors.white38, size: 50),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    _buildGlassSection(
                      title: "РЕЖИМ ОТОБРАЖЕНИЯ",
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Expanded(
                              child: Text(
                                "Использовать PDF-меню / документ вместо текста или фото",
                                style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ),
                            CupertinoSwitch(
                              value: _gmConfig.usePdfMenu,
                              activeColor: AppColors.accentOrange,
                              onChanged: (val) {
                                setState(() {
                                  _gmConfig = _gmConfig.copyWith(usePdfMenu: val, usePhotoMenu: val ? false : _gmConfig.usePhotoMenu);
                                });
                              },
                            ),
                          ],
                        ),
                        if (_gmConfig.usePdfMenu) ...[
                          const Divider(color: Colors.white12, height: 32),
                          _buildCupertinoField("Ссылка на PDF документ меню (URL)", _menuPdfUrlCtrl, placeholder: "https://.../menu.pdf"),
                          const SizedBox(height: 8),
                          SizedBox(
                            height: 120,
                            child: ImageUploadWidget(
                              key: ValueKey("upload_pdf_${_menuPdfUrlCtrl.text}"),
                              initialUrl: _menuPdfUrlCtrl.text.isNotEmpty ? _menuPdfUrlCtrl.text : null,
                              label: "Загрузить PDF или фото меню",
                              path: "venues/menus/${widget.venue.id}",
                              onUploadComplete: (url) {
                                setState(() {
                                  _menuPdfUrlCtrl.text = url;
                                  _gmConfig = _gmConfig.copyWith(menuPdfUrl: url, usePdfMenu: true);
                                });
                              },
                            ),
                          ),
                        ],
                        const Divider(color: Colors.white12, height: 32),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Expanded(
                              child: Text(
                                "Использовать фото-меню (слайдер) вместо текстового списка",
                                style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ),
                            CupertinoSwitch(
                              value: _gmConfig.usePhotoMenu,
                              activeColor: AppColors.accentOrange,
                              onChanged: (val) {
                                setState(() {
                                  _gmConfig = _gmConfig.copyWith(usePhotoMenu: val, usePdfMenu: val ? false : _gmConfig.usePdfMenu);
                                });
                              },
                            ),
                          ],
                        ),
                        if (_gmConfig.usePhotoMenu) ...[
                          const Divider(color: Colors.white12, height: 32),
                          const Text("Пропорции фотографий", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13)),
                          const SizedBox(height: 8),
                          CupertinoSlidingSegmentedControl<String>(
                            groupValue: _gmConfig.photoAspectRatio,
                            children: const {
                              '1:1': Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text("1:1 (Квадрат)")),
                              '3:4': Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text("3:4 (Портрет)")),
                              '16:9': Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text("16:9 (Ландшафт)")),
                            },
                            onValueChanged: (val) {
                              if (val != null) {
                                setState(() {
                                  _gmConfig = _gmConfig.copyWith(photoAspectRatio: val);
                                });
                              }
                            },
                          ),
                          const SizedBox(height: 24),
                          const Text("Вписывание фотографий", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13)),
                          const SizedBox(height: 8),
                          CupertinoSlidingSegmentedControl<String>(
                            groupValue: _gmConfig.photoFit,
                            children: const {
                              'cover': Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text("Обрезка (Cover)")),
                              'contain': Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text("Целиком (Contain)")),
                            },
                            onValueChanged: (val) {
                              if (val != null) {
                                setState(() {
                                  _gmConfig = _gmConfig.copyWith(photoFit: val);
                                });
                              }
                            },
                          ),
                        ]
                      ],
                    ),
                    const SizedBox(height: 32),
                    if (_gmConfig.usePhotoMenu) ...[
                      _buildGlassSection(
                        title: "ФОТО-МЕНЮ (СЛАЙДЕР)",
                        children: [
                          const Text(
                            "Эти фотографии будут отображаться в виде горизонтального слайдера на лендинге.",
                            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: [
                              for (int i = 0; i < _gmConfig.menuPhotos.length; i++)
                                Column(
                                  children: [
                                    Stack(
                                      children: [
                                        GestureDetector(
                                          onTap: () => _showFullScreenImage(_gmConfig.menuPhotos[i]),
                                          child: ClipRRect(
                                            borderRadius: BorderRadius.circular(12),
                                            child: Image.network(
                                              _gmConfig.menuPhotos[i],
                                              width: _gmConfig.photoAspectRatio == '16:9' ? 160 : (_gmConfig.photoAspectRatio == '3:4' ? 90 : 100),
                                              height: _gmConfig.photoAspectRatio == '16:9' ? 90 : (_gmConfig.photoAspectRatio == '3:4' ? 120 : 100),
                                              fit: _gmConfig.photoFit == 'contain' ? BoxFit.contain : BoxFit.cover,
                                              errorBuilder: (context, error, stackTrace) => Container(
                                                width: _gmConfig.photoAspectRatio == '16:9' ? 160 : (_gmConfig.photoAspectRatio == '3:4' ? 90 : 100),
                                                height: _gmConfig.photoAspectRatio == '16:9' ? 90 : (_gmConfig.photoAspectRatio == '3:4' ? 120 : 100),
                                                color: Colors.grey[800],
                                                child: const Icon(Icons.broken_image, color: Colors.white54),
                                              ),
                                            ),
                                          ),
                                        ),
                                        Positioned(
                                          top: 4,
                                          right: 4,
                                          child: GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                final photos = List<String>.from(_gmConfig.menuPhotos);
                                                photos.removeAt(i);
                                                _gmConfig = _gmConfig.copyWith(menuPhotos: photos);
                                              });
                                            },
                                            child: Container(
                                              padding: const EdgeInsets.all(4),
                                              decoration: const BoxDecoration(
                                                color: Colors.black54,
                                                shape: BoxShape.circle,
                                              ),
                                              child: const Icon(Icons.close, color: Colors.white, size: 14),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        if (i > 0)
                                          GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                final photos = List<String>.from(_gmConfig.menuPhotos);
                                                final temp = photos[i - 1];
                                                photos[i - 1] = photos[i];
                                                photos[i] = temp;
                                                _gmConfig = _gmConfig.copyWith(menuPhotos: photos);
                                              });
                                            },
                                            child: const Icon(Icons.arrow_back_ios, size: 16, color: Colors.white70),
                                          ),
                                        if (i > 0 && i < _gmConfig.menuPhotos.length - 1)
                                          const SizedBox(width: 24),
                                        if (i < _gmConfig.menuPhotos.length - 1)
                                          GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                final photos = List<String>.from(_gmConfig.menuPhotos);
                                                final temp = photos[i + 1];
                                                photos[i + 1] = photos[i];
                                                photos[i] = temp;
                                                _gmConfig = _gmConfig.copyWith(menuPhotos: photos);
                                              });
                                            },
                                            child: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.white70),
                                          ),
                                      ],
                                    )
                                  ],
                                ),
                              SizedBox(
                                width: _gmConfig.photoAspectRatio == '16:9' ? 160 : (_gmConfig.photoAspectRatio == '3:4' ? 90 : 100),
                                height: _gmConfig.photoAspectRatio == '16:9' ? 90 : (_gmConfig.photoAspectRatio == '3:4' ? 120 : 100),
                                child: ImageUploadWidget(
                                  key: ValueKey("upload_${_gmConfig.menuPhotos.length}"),
                                  label: "",
                                  path: "venues/covers/${widget.venue.id}",
                                  onUploadComplete: (url) {
                                    setState(() {
                                      _gmConfig = _gmConfig.copyWith(
                                        menuPhotos: [..._gmConfig.menuPhotos, url],
                                      );
                                    });
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ] else if (_gmConfig.businessType == 'horeca') ...[
                      _buildGlassSection(
                        title: "МЕНЮ (HoReCa)",
                        children: [
                          for (int i = 0; i < _gmConfig.menuItems.length; i++)
                            _buildMenuItemEditor(i),
                          const SizedBox(height: 16),
                          CupertinoButton.filled(
                            onPressed: _addMenuItem,
                            child: const Text("+ Добавить позицию меню"),
                          )
                        ],
                      ),
                    ] else ...[
                      _buildGlassSection(
                        title: "ПРАЙС-ЛИСТ (УСЛУГИ)",
                        children: [
                          for (int i = 0; i < _gmConfig.services.length; i++)
                            _buildServiceItemEditor(i),
                          const SizedBox(height: 16),
                          CupertinoButton.filled(
                            onPressed: _addServiceItem,
                            child: const Text("+ Добавить услугу"),
                          )
                        ],
                      ),
                    ],
                    const SizedBox(height: 48),
                    SizedBox(
                      width: double.infinity,
                      child: CupertinoButton(
                        color: AppColors.accentOrange,
                        onPressed: _save,
                        borderRadius: BorderRadius.circular(10),
                        child: const Text("СОХРАНИТЬ", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMenuItemEditor(int index) {
    final item = _gmConfig.menuItems[index];
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Позиция ${index + 1}", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              IconButton(
                icon: const Icon(Icons.delete, color: Colors.redAccent, size: 20),
                onPressed: () => _removeMenuItem(index),
              )
            ],
          ),
          _buildSimpleField("Название", item.name, (val) {
            final items = List<GmMenuItem>.from(_gmConfig.menuItems);
            items[index] = GmMenuItem(name: val, description: item.description, price: item.price, imageUrl: item.imageUrl);
            setState(() => _gmConfig = _gmConfig.copyWith(menuItems: items));
          }),
          _buildSimpleField("Описание", item.description, (val) {
            final items = List<GmMenuItem>.from(_gmConfig.menuItems);
            items[index] = GmMenuItem(name: item.name, description: val, price: item.price, imageUrl: item.imageUrl);
            setState(() => _gmConfig = _gmConfig.copyWith(menuItems: items));
          }),
          Row(
            children: [
              Expanded(
                child: _buildSimpleField("Цена", item.price, (val) {
                  final items = List<GmMenuItem>.from(_gmConfig.menuItems);
                  items[index] = GmMenuItem(name: item.name, description: item.description, price: val, imageUrl: item.imageUrl);
                  setState(() => _gmConfig = _gmConfig.copyWith(menuItems: items));
                }),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSimpleField("Фото URL", item.imageUrl, (val) {
                  final items = List<GmMenuItem>.from(_gmConfig.menuItems);
                  items[index] = GmMenuItem(name: item.name, description: item.description, price: item.price, imageUrl: val);
                  setState(() => _gmConfig = _gmConfig.copyWith(menuItems: items));
                }),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildServiceItemEditor(int index) {
    final item = _gmConfig.services[index];
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Услуга ${index + 1}", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              IconButton(
                icon: const Icon(Icons.delete, color: Colors.redAccent, size: 20),
                onPressed: () => _removeServiceItem(index),
              )
            ],
          ),
          _buildSimpleField("Категория (опционально)", item.category, (val) {
            final items = List<GmServiceItem>.from(_gmConfig.services);
            items[index] = GmServiceItem(category: val, name: item.name, description: item.description, price: item.price, duration: item.duration);
            setState(() => _gmConfig = _gmConfig.copyWith(services: items));
          }),
          _buildSimpleField("Название", item.name, (val) {
            final items = List<GmServiceItem>.from(_gmConfig.services);
            items[index] = GmServiceItem(category: item.category, name: val, description: item.description, price: item.price, duration: item.duration);
            setState(() => _gmConfig = _gmConfig.copyWith(services: items));
          }),
          _buildSimpleField("Описание", item.description, (val) {
            final items = List<GmServiceItem>.from(_gmConfig.services);
            items[index] = GmServiceItem(category: item.category, name: item.name, description: val, price: item.price, duration: item.duration);
            setState(() => _gmConfig = _gmConfig.copyWith(services: items));
          }),
          Row(
            children: [
              Expanded(
                child: _buildSimpleField("Цена", item.price, (val) {
                  final items = List<GmServiceItem>.from(_gmConfig.services);
                  items[index] = GmServiceItem(category: item.category, name: item.name, description: item.description, price: val, duration: item.duration);
                  setState(() => _gmConfig = _gmConfig.copyWith(services: items));
                }),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSimpleField("Длительность", item.duration, (val) {
                  final items = List<GmServiceItem>.from(_gmConfig.services);
                  items[index] = GmServiceItem(category: item.category, name: item.name, description: item.description, price: item.price, duration: val);
                  setState(() => _gmConfig = _gmConfig.copyWith(services: items));
                }),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildSimpleField(String label, String value, Function(String) onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
          const SizedBox(height: 4),
          CupertinoTextField(
            controller: TextEditingController(text: value)..selection = TextSelection.collapsed(offset: value.length),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.3),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: Colors.white24),
            ),
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildGlassSection({required String title, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 12, bottom: 12),
          child: Text(
            title,
            style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
          ),
        ),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.macosSurfaceBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.macosDivider),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: children
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCupertinoField(String label, TextEditingController controller, {String? placeholder, int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          CupertinoTextField(
            controller: controller,
            placeholder: placeholder,
            placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.2), fontSize: 14),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            padding: const EdgeInsets.all(16),
            maxLines: maxLines,
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.macosDivider),
            ),
          ),
        ],
      ),
    );
  }
}
