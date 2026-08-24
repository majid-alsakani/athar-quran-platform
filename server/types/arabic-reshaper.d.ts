declare module "arabic-reshaper" {
  const ArabicReshaper: {
    convertArabic(value: string): string;
    convertArabicBack(value: string): string;
  };
  export default ArabicReshaper;
}
