"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Home, MapPin, Search, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

import { rentalCategoryOptions } from "@/lib/listing-options";
import { locationService } from "@/services/location-service";
import type { AreaRead } from "@/types/location";

import styles from "./HeroSearch.module.css";

export default function HeroSearch() {
  const router = useRouter();
  const [areas, setAreas] = useState<AreaRead[]>([]);
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    locationService.listAreas().then(setAreas).catch(() => setAreas([]));
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (category) params.set("category", category);
    if (maxPrice.trim()) params.set("max_price", maxPrice.trim());
    const query = params.toString();
    router.push(query ? `/rentals?${query}` : "/rentals");
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <span className={styles.iconBox}><MapPin aria-hidden="true" /></span>
        <label>
          <span>Area</span>
          <select value={area} onChange={(event) => setArea(event.target.value)}>
            <option value="">Anywhere around OOU</option>
            {areas.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.field}>
        <span className={styles.iconBox}><Home aria-hidden="true" /></span>
        <label>
          <span>Home type</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Any rental type</option>
            {rentalCategoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.field}>
        <span className={styles.iconBox}><Wallet aria-hidden="true" /></span>
        <label>
          <span>Maximum budget</span>
          <input
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="e.g. 250000"
          />
        </label>
      </div>

      <button type="submit" className={styles.submitButton}>
        <Search aria-hidden="true" />
        Search rentals
      </button>
    </form>
  );
}