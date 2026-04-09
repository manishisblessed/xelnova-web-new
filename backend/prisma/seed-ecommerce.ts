import type { PrismaClient } from "@prisma/client";

const yearFromNow = () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

/**
 * Idempotent demo data for Categories-adjacent ecommerce admin tabs.
 * Safe to run on production to populate empty Banners / Coupons / Brands / CMS without wiping other data.
 * (Categories are usually created by the main seed tree; this file does not remove categories.)
 */
export async function upsertEcommerceDemoData(prisma: PrismaClient) {
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const roots = [
      { name: "Electronics", slug: "electronics", description: "Phones, laptops, audio & accessories" },
      { name: "Fashion", slug: "fashion", description: "Clothing, footwear & accessories" },
      { name: "Home & Kitchen", slug: "home-kitchen", description: "Furniture, appliances & decor" },
      { name: "Beauty & Personal Care", slug: "beauty", description: "Skincare, makeup & grooming" },
      { name: "Sports & Fitness", slug: "sports", description: "Equipment, apparel & nutrition" },
      { name: "Books", slug: "books", description: "Fiction, non-fiction & more" },
    ];
    for (const c of roots) {
      await prisma.category.upsert({
        where: { slug: c.slug },
        create: {
          name: c.name,
          slug: c.slug,
          description: c.description,
          productCount: 0,
        },
        update: { name: c.name, description: c.description },
      });
    }
  }

  const brands = [
    { slug: "samsung", name: "Samsung", logo: "", featured: true },
    { slug: "apple", name: "Apple", logo: "", featured: true },
    { slug: "sony", name: "Sony", logo: "", featured: true },
    { slug: "nike", name: "Nike", logo: "", featured: true },
    { slug: "adidas", name: "Adidas", logo: "", featured: false },
    { slug: "puma", name: "Puma", logo: "", featured: false },
    { slug: "boat", name: "boAt", logo: "", featured: false },
    { slug: "philips", name: "Philips", logo: "", featured: false },
    { slug: "lg", name: "LG", logo: "", featured: false },
    { slug: "whirlpool", name: "Whirlpool", logo: "", featured: false },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      create: {
        name: b.name,
        slug: b.slug,
        logo: b.logo || null,
        featured: b.featured,
        isActive: true,
        approved: true,
      },
      update: {
        name: b.name,
        logo: b.logo || null,
        featured: b.featured,
        isActive: true,
        approved: true,
      },
    });
  }

  const banners = [
    {
      id: "seed-banner-hero-1",
      title: "Big festive sale",
      subtitle: "Up to 50% off",
      description: "Shop electronics, fashion, and home essentials.",
      image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&h=400&fit=crop",
      ctaText: "Shop now",
      ctaLink: "/categories/electronics",
      bgColor: "#7c3aed",
      sortOrder: 0,
      position: "hero",
      isActive: true,
    },
    {
      id: "seed-banner-hero-2",
      title: "New arrivals",
      subtitle: "Fresh styles every week",
      description: "Discover the latest in fashion and accessories.",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
      ctaText: "Explore",
      ctaLink: "/categories/fashion",
      bgColor: "#0d9488",
      sortOrder: 1,
      position: "hero",
      isActive: true,
    },
    {
      id: "seed-banner-strip-1",
      title: "Free delivery",
      subtitle: "On orders above ₹499",
      description: null,
      image: null,
      ctaText: "Learn more",
      ctaLink: "/pages/shipping",
      bgColor: "#1e293b",
      sortOrder: 2,
      position: "strip",
      isActive: true,
    },
  ];

  for (const row of banners) {
    await prisma.banner.upsert({
      where: { id: row.id },
      create: row,
      update: {
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        image: row.image,
        ctaText: row.ctaText,
        ctaLink: row.ctaLink,
        bgColor: row.bgColor,
        sortOrder: row.sortOrder,
        position: row.position,
        isActive: row.isActive,
      },
    });
  }

  const coupons = [
    {
      code: "WELCOME10",
      description: "10% off your first order",
      discountType: "PERCENTAGE" as const,
      discountValue: 10,
      minOrderAmount: 299,
      maxDiscount: 500,
      validUntil: yearFromNow(),
      isActive: true,
      usageLimit: 5000,
      scope: "global",
    },
    {
      code: "FLAT100",
      description: "₹100 off on orders ₹999+",
      discountType: "FLAT" as const,
      discountValue: 100,
      minOrderAmount: 999,
      maxDiscount: null,
      validUntil: yearFromNow(),
      isActive: true,
      usageLimit: null,
      scope: "global",
    },
    {
      code: "MEGA15",
      description: "15% off (max ₹750) during campaigns",
      discountType: "PERCENTAGE" as const,
      discountValue: 15,
      minOrderAmount: 1499,
      maxDiscount: 750,
      validUntil: yearFromNow(),
      isActive: true,
      usageLimit: 10000,
      scope: "global",
    },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount,
        maxDiscount: c.maxDiscount,
        validUntil: c.validUntil,
        isActive: c.isActive,
        usageLimit: c.usageLimit,
        usedCount: 0,
        scope: c.scope,
      },
      update: {
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount,
        maxDiscount: c.maxDiscount,
        validUntil: c.validUntil,
        isActive: c.isActive,
        usageLimit: c.usageLimit,
        scope: c.scope,
      },
    });
  }

  const cmsPages = [
    {
      slug: "about-us",
      title: "About Us",
      content:
        "<p>Xelnova is a marketplace built for trusted sellers and happy customers across India.</p><p>We focus on quality listings, fair pricing, and reliable delivery.</p>",
      status: "published",
      author: "Xelnova",
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      content:
        "<p>We respect your privacy. This page describes how we collect, use, and protect your personal information when you use Xelnova.</p><ul><li>Account and order data</li><li>Cookies and analytics</li><li>Your rights and contact</li></ul>",
      status: "published",
      author: "Legal",
    },
    {
      slug: "terms-of-service",
      title: "Terms of Service",
      content:
        "<p>By using Xelnova you agree to these terms. Please read them carefully before placing an order.</p>",
      status: "published",
      author: "Legal",
    },
    {
      slug: "shipping",
      title: "Shipping & Delivery",
      content:
        "<p>Standard delivery timelines apply by pincode. You will receive tracking details once your order ships.</p>",
      status: "published",
      author: "Support",
    },
    {
      slug: "returns",
      title: "Returns & Refunds",
      content:
        "<p>Eligible items can be returned within the policy window. Refunds are processed to the original payment method where possible.</p>",
      status: "published",
      author: "Support",
    },
    {
      slug: "contact",
      title: "Contact Us",
      content:
        "<p>Email: support@xelnova.in</p><p>We typically respond within one business day.</p>",
      status: "published",
      author: "Support",
    },
  ];

  for (const p of cmsPages) {
    await prisma.cmsPage.upsert({
      where: { slug: p.slug },
      create: {
        title: p.title,
        slug: p.slug,
        content: p.content,
        status: p.status,
        author: p.author,
      },
      update: {
        title: p.title,
        content: p.content,
        status: p.status,
        author: p.author,
      },
    });
  }

  return {
    categoriesEnsured: categoryCount === 0 ? 6 : 0,
    brands: brands.length,
    banners: banners.length,
    coupons: coupons.length,
    cmsPages: cmsPages.length,
  };
}
