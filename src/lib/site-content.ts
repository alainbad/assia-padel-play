import { z } from "zod";
import hero1 from "@/assets/hero-1.jpg.asset.json";
import hero3 from "@/assets/hero-3.jpg.asset.json";
import hero4 from "@/assets/hero-4.jpg.asset.json";
const text = z.string().trim().min(1).max(5000);
const url = z
  .string()
  .max(2000)
  .refine(
    (v) => /^https:\/\//.test(v) || /^\/(?!\/)/.test(v),
    "Use an https URL or a site image path",
  );
const image = z.object({ url, alt: text });
export const contentSchema = z.object({
  heroTitle: text,
  heroSubtitle: text,
  heroImages: z.array(image).min(1).max(8),
  bookingTitle: text,
  bookingSubtitle: text,
  photosTitle: text,
  photosSubtitle: text,
  courtImages: z.array(image).min(1).max(12),
  aboutTitle: text,
  aboutBody: text,
  aboutLink: text,
  facilitiesTitle: text,
  facilities: z.array(text).min(1).max(20),
  locationTitle: text,
  locationAddress: text,
  locationImage: url,
  locationAlt: text,
  directionsUrl: z
    .string()
    .url()
    .refine((v) => v.startsWith("https://")),
  directionsLabel: text,
  contactTitle: text,
  contactBody: text,
  phone: text,
  whatsapp: z.string().regex(/^\d{7,15}$/),
  whatsappLabel: text,
  copyright: text,
});
export const defaultContent = contentSchema.parse({
  heroTitle: "Your Court. Your Game.",
  heroSubtitle: "Book your next padel session in seconds.",
  heroImages: [
    { url: "/images/assia-padel-preview.jpg", alt: "Assia Padel Court — the wait is almost over" },
    { url: "/images/assia-coming-soon.jpg", alt: "Assia Padel Court — coming soon" },
  ],
  bookingTitle: "Book Your Court",
  bookingSubtitle: "One court. Simple availability. Under 30 seconds.",
  photosTitle: "Court Photos",
  photosSubtitle: "A glimpse of the court before your visit.",
  courtImages: [
    { url: hero1.url, alt: "Outdoor padel court at golden hour in the Lebanese mountains" },
    { url: hero3.url, alt: "Close-up of the padel court net and green surface" },
    { url: hero4.url, alt: "Friends enjoying a padel game at Assia" },
  ],
  aboutTitle: "A court for the village",
  aboutBody:
    "Assia Padel Court is a single outdoor court built for casual games, friendly competition, and easy evenings in the Lebanese mountains. No memberships, no app stores — just book and play.",
  aboutLink: "More about the court",
  facilitiesTitle: "Facilities",
  facilities: [
    "Outdoor court with floodlights",
    "Parking on-site",
    "Racket & ball rental",
    "Drinks available",
    "Seating area",
  ],
  locationTitle: "Find us",
  locationAddress: "Assia, Batroun District, Lebanon",
  locationImage: "/images/assia-location-edited.jpg",
  locationAlt: "Locate us — Assia Padel Court",
  directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=34.225754,35.779507",
  directionsLabel: "Get Directions",
  contactTitle: "Questions?",
  contactBody: "Reach us directly on WhatsApp or by phone.",
  phone: "+961 3 414 477",
  whatsapp: "9613414477",
  whatsappLabel: "Contact on WhatsApp",
  copyright: "Assia Padel Court. All rights reserved.",
});
export type SiteContent = z.infer<typeof contentSchema>;
export const scheduleSchema = z
  .object({
    times: z
      .array(z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/))
      .min(1)
      .max(48),
    duration: z.number().int().min(30).max(240),
    price: z.number().min(0).max(10000),
  })
  .refine(
    (s) =>
      new Set(s.times).size === s.times.length &&
      [...s.times]
        .sort()
        .every(
          (t, i, a) =>
            i === 0 ||
            Number(t.slice(0, 2)) * 60 +
              Number(t.slice(3)) -
              (Number(a[i - 1]!.slice(0, 2)) * 60 + Number(a[i - 1]!.slice(3))) >=
              s.duration,
        ),
    "Slots must be unique and cannot overlap",
  );
export const defaultSchedule = {
  times: [
    "08:00",
    "09:30",
    "11:00",
    "12:30",
    "14:00",
    "15:30",
    "17:00",
    "18:30",
    "20:00",
    "21:30",
    "23:00",
  ],
  duration: 90,
  price: 20,
};
