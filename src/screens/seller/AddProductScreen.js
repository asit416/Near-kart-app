// src/screens/seller/AddProductScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { addProduct, uploadProductImages, updateProduct } from '../../services/productService';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CATEGORIES } from '../../theme';

const MAX_IMAGES = 5;

export default function AddProductScreen({ route, navigation }) {
  const existingProduct = route.params?.product;
  const isEditing = !!existingProduct;

  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [images, setImages] = useState(existingProduct?.images?.map((uri) => ({ uri })) || []);
  const [name, setName] = useState(existingProduct?.name || '');
  const [description, setDescription] = useState(existingProduct?.description || '');
  const [price, setPrice] = useState(existingProduct?.price?.toString() || '');
  const [discountPrice, setDiscountPrice] = useState(existingProduct?.discountPrice?.toString() || '');
  const [stock, setStock] = useState(existingProduct?.stock?.toString() || '');
  const [category, setCategory] = useState(existingProduct?.category || 'other');
  const [unit, setUnit] = useState(existingProduct?.unit || 'piece');
  const [isActive, setIsActive] = useState(existingProduct?.isActive !== false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Maximum Images', `You can add up to ${MAX_IMAGES} images`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: MAX_IMAGES - images.length,
    });

    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets].slice(0, MAX_IMAGES));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0]].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!price || isNaN(Number(price))) newErrors.price = 'Valid price is required';
    if (!stock || isNaN(Number(stock))) newErrors.stock = 'Valid stock quantity is required';
    if (!category) newErrors.category = 'Category is required';
    if (images.length === 0) newErrors.images = 'At least one image is required';
    if (discountPrice && Number(discountPrice) >= Number(price)) {
      newErrors.discountPrice = 'Discount price must be less than original price';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setUploading(true);
    try {
      // Upload new images (those with local URIs)
      const newImages = images.filter((img) => !img.uri.startsWith('https://'));
      const existingUrls = images.filter((img) => img.uri.startsWith('https://')).map((img) => img.uri);

      let uploadedUrls = existingUrls;
      if (newImages.length > 0) {
        const uploaded = await uploadProductImages(newImages, userProfile.uid, setUploadProgress);
        uploadedUrls = [...existingUrls, ...uploaded];
      }

      const productData = {
        name: name.trim(),
        nameLower: name.trim().toLowerCase(),
        description: description.trim(),
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        stock: Number(stock),
        category,
        unit,
        images: uploadedUrls,
        sellerName: userProfile.shopName,
        sellerLocation: userProfile.location || null,
        isActive,
      };

      let result;
      if (isEditing) {
        result = await updateProduct(existingProduct.id, productData);
      } else {
        result = await addProduct(productData, userProfile.uid);
      }

      if (result.success) {
        Alert.alert(
          'Success!',
          isEditing ? 'Product updated successfully' : 'Product added successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const InputField = ({ label, value, onChange, error, placeholder, keyboardType = 'default', multiline = false }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea, error && styles.inputError]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray400}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray800} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Product' : 'Add Product'}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Images */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Images *</Text>
            <Text style={styles.sectionSubtitle}>Add up to {MAX_IMAGES} images</Text>
            {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
              {images.map((img, index) => (
                <View key={index} style={styles.imageThumb}>
                  <Image source={{ uri: img.uri }} style={styles.thumbImage} />
                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Main</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < MAX_IMAGES && (
                <View style={styles.addImageBtns}>
                  <TouchableOpacity style={styles.addImageBtn} onPress={takePhoto}>
                    <Ionicons name="camera" size={24} color={Colors.primary} />
                    <Text style={styles.addImageText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                    <Ionicons name="images" size={24} color={Colors.primary} />
                    <Text style={styles.addImageText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Details</Text>

            <InputField
              label="Product Name *"
              value={name}
              onChange={setName}
              error={errors.name}
              placeholder="e.g. Fresh Tomatoes, iPhone 13..."
            />
            <InputField
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Describe your product..."
              multiline
            />
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing & Stock</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Price (₹) *"
                  value={price}
                  onChange={setPrice}
                  error={errors.price}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Discount Price (₹)"
                  value={discountPrice}
                  onChange={setDiscountPrice}
                  error={errors.discountPrice}
                  placeholder="Optional"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Stock Quantity *"
                  value={stock}
                  onChange={setStock}
                  error={errors.stock}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <View style={styles.unitSelector}>
                    {['piece', 'kg', 'g', 'litre', 'pack'].map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unitChip, unit === u && styles.unitChipActive]}
                        onPress={() => setUnit(u)}
                      >
                        <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category *</Text>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
            <View style={styles.categoriesGrid}>
              {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    category === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                  <Text style={[styles.categoryText, category === cat.id && { color: Colors.white }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Active Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Product Active</Text>
                <Text style={styles.toggleSubtext}>Buyers can see and order this product</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={isActive ? Colors.primary : Colors.gray400}
              />
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.submitContainer, { paddingBottom: insets.bottom + Spacing.base }]}>
          {uploading && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
          )}
          <TouchableOpacity
            style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.uploadingRow}>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text style={styles.submitText}>Uploading... {uploadProgress}%</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>
                {isEditing ? '💾 Save Changes' : '✅ Add Product'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.white, ...Shadows.sm,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: Typography.fontBold, fontSize: Typography.lg, color: Colors.gray900 },
  section: { backgroundColor: Colors.white, marginHorizontal: Spacing.base, marginTop: Spacing.md, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadows.sm },
  sectionTitle: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.gray800, marginBottom: 2 },
  sectionSubtitle: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400, marginBottom: Spacing.md },

  imagesRow: { flexDirection: 'row' },
  imageThumb: { width: 90, height: 90, borderRadius: BorderRadius.md, marginRight: Spacing.sm, position: 'relative' },
  thumbImage: { width: '100%', height: '100%', borderRadius: BorderRadius.md },
  primaryBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  primaryBadgeText: { color: Colors.white, fontFamily: Typography.fontBold, fontSize: 9 },
  removeImageBtn: { position: 'absolute', top: -6, right: -6 },
  addImageBtns: { flexDirection: 'row', gap: Spacing.sm },
  addImageBtn: {
    width: 90, height: 90,
    borderWidth: 2, borderColor: Colors.primaryLight, borderStyle: 'dashed',
    borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addImageText: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.primary },

  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.gray700, marginBottom: 6 },
  input: {
    backgroundColor: Colors.gray50, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    fontFamily: Typography.fontRegular, fontSize: Typography.base, color: Colors.gray800,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  inputError: { borderColor: Colors.error },
  errorText: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.error, marginTop: 4 },
  row: { flexDirection: 'row', gap: Spacing.sm },

  unitSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  unitChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.gray200, backgroundColor: Colors.gray50 },
  unitChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitChipText: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray600 },
  unitChipTextActive: { color: Colors.white },

  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
  },
  categoryEmoji: { fontSize: 14 },
  categoryText: { fontFamily: Typography.fontMedium, fontSize: Typography.xs, color: Colors.gray600 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontFamily: Typography.fontSemiBold, fontSize: Typography.sm, color: Colors.gray800 },
  toggleSubtext: { fontFamily: Typography.fontRegular, fontSize: Typography.xs, color: Colors.gray400 },

  submitContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, padding: Spacing.base, ...Shadows.lg,
  },
  progressBar: { height: 4, backgroundColor: Colors.gray100, borderRadius: 2, marginBottom: Spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.7 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  submitText: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.white },
});
