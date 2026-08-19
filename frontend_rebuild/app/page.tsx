import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Building2,
  Check,
  Home,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";

import HeroSearch from "@/components/home/HeroSearch";
import { rentalAreas } from "@/lib/site-data";

import styles from "./page.module.css";


const services = [
  {
    icon: Home,
    number: "01",
    label: "Rentals",
    title: "Find somewhere that feels right.",
    description:
      "Rooms, hostels, self-contained spaces and apartments around OOU.",
    href: "/rentals",
    action: "Explore rentals",
  },
  {
    icon: Building2,
    number: "02",
    label: "Property",
    title: "Explore property around you.",
    description:
      "Discover land, houses and investment opportunities from approved publishers.",
    href: "/buy-property",
    action: "Browse property",
  },
  {
    icon: Store,
    number: "03",
    label: "Marketplace",
    title: "Buy and sell around campus.",
    description:
      "Furniture, phones, appliances, books and everyday student items nearby.",
    href: "/marketplace",
    action: "Open marketplace",
  },
];


const steps = [
  {
    icon: Search,
    number: "01",
    title: "Search",
    text:
      "Start with your area, budget and the kind of place you actually want.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "Check",
    text:
      "Look through listing media, information and publisher details before reaching out.",
  },
  {
    icon: MessageCircle,
    number: "03",
    title: "Connect",
    text:
      "Ask questions, send an inquiry and arrange the next step when you are ready.",
  },
];


const marketplaceItems = [
  {
    number: "01",
    category: "Furniture",
    name: "Reading desk",
    price: "₦25,000",
  },
  {
    number: "02",
    category: "Gadgets",
    name: "Laptop stand",
    price: "₦8,500",
  },
  {
    number: "03",
    category: "Appliances",
    name: "Mini refrigerator",
    price: "₦72,000",
  },
];


export default function HomePage() {
  return (
    <main className={styles.page}>
      {/* =====================================================
          HERO
      ====================================================== */}

      <section className={styles.hero}>
        <Image
          src="/images/home/hero-home.jpg"
          alt="Modern residential home"
          fill
          priority
          quality={92}
          sizes="100vw"
          className={styles.heroImage}
        />

        <div
          className={styles.heroOverlay}
          aria-hidden="true"
        />

        <div
          className={styles.heroTexture}
          aria-hidden="true"
        />

        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>
              HomeLink · Around OOU
            </span>

            <h1>
              Find your place.
              <br />

              <span>
                Live closer.
              </span>
            </h1>

            <p>
              Rentals, property and everyday student deals —
              all brought together around the places you
              already know.
            </p>

            <div className={styles.heroActions}>
              <Link
                href="/rentals"
                className={styles.heroPrimary}
              >
                Find a home

                <ArrowRight aria-hidden="true" />
              </Link>

              <Link
                href="/marketplace"
                className={styles.heroSecondary}
              >
                Explore marketplace
              </Link>
            </div>
          </div>

          <div className={styles.heroBottom}>
            <div className={styles.heroTrust}>
              <span>
                <Check aria-hidden="true" />
                Moderated listings
              </span>

              <span>
                <Check aria-hidden="true" />
                Reporting built in
              </span>

              <span>
                <Check aria-hidden="true" />
                Made around OOU
              </span>
            </div>

            <div className={styles.heroLocation}>
              <MapPin aria-hidden="true" />

              <div>
                <small>
                  Starting around
                </small>

                <strong>
                  Ago-Iwoye, Ogun State
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.searchWrap}>
          <div className={styles.searchTop}>
            <div>
              <span>
                Search rentals
              </span>

              <strong>
                Find something near campus
              </strong>
            </div>

            <p>
              Choose your area, type and budget.
            </p>
          </div>

          <HeroSearch />
        </div>
      </section>


      {/* =====================================================
          INTRO
      ====================================================== */}

      <section className={styles.homeIntro}>
        <div className={styles.homeIntroTop}>
          <span className={styles.homeIntroIndex}>
            01 / Explore
          </span>

          <div className={styles.homeIntroStatement}>
            <h2>
              One place for the things
              that shape life around campus.
            </h2>

            <div className={styles.homeIntroSide}>
              <p>
                From finding somewhere to stay,
                to buying property or picking up
                something useful nearby.
              </p>

              <Link
                href="/rentals"
                className={styles.homeIntroLink}
              >
                Start exploring

                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>


        {/* =================================================
            SERVICES
        ================================================== */}

        <div className={styles.serviceRows}>
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <Link
                key={service.href}
                href={service.href}
                className={styles.serviceRow}
              >
                <span className={styles.serviceRowNumber}>
                  {service.number}
                </span>

                <span className={styles.serviceRowIcon}>
                  <Icon aria-hidden="true" />
                </span>

                <div className={styles.serviceRowMain}>
                  <span className={styles.serviceRowLabel}>
                    {service.label}
                  </span>

                  <h3>
                    {service.title}
                  </h3>
                </div>

                <p className={styles.serviceRowDescription}>
                  {service.description}
                </p>

                <span className={styles.serviceRowArrow}>
                  <ArrowRight aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>


      {/* =====================================================
          LOCATION FEATURE
      ====================================================== */}

      <section className={styles.locationFeature}>
        <div className={styles.locationFeatureVisual}>
          <Image
            src="/images/home/hero-home.jpg"
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 48vw"
            className={styles.locationFeatureImage}
          />

          <div
            className={styles.locationFeatureOverlay}
            aria-hidden="true"
          />

          <div className={styles.locationFeatureContent}>
            <span>
              Around campus
            </span>

            <strong>
              Start from somewhere
              you already know.
            </strong>

            <p>
              Search the areas closest to
              your classes, routines and
              everyday life.
            </p>
          </div>
        </div>


        <div className={styles.locationFeatureCopy}>
          <div className={styles.locationFeatureHeader}>
            <span className={styles.sectionEyebrow}>
              Search nearby
            </span>

            <h2>
              Your area can
              change everything.
            </h2>

            <p>
              Start with communities around OOU
              and narrow your search from there.
            </p>
          </div>

          <Link
            href="/rentals"
            className={styles.blueTextLink}
          >
            View all rentals

            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>


      {/* =====================================================
          AREAS
      ====================================================== */}

      <section className={styles.areasSection}>
        <div className={styles.areaList}>
          {rentalAreas.map((area, index) => (
            <Link
              key={area.slug}
              href={`/rentals?area=${area.slug}`}
              className={styles.areaItem}
            >
              <span className={styles.areaNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className={styles.areaIcon}>
                <MapPin aria-hidden="true" />
              </span>

              <span className={styles.areaName}>
                <small>
                  {area.campus}
                </small>

                <strong>
                  {area.name}
                </strong>
              </span>

              <p>
                {area.description}
              </p>

              <span className={styles.areaArrow}>
                <ArrowRight aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>


      {/* =====================================================
          BLUE STATEMENT
      ====================================================== */}

      <section className={styles.statementSection}>
        <div className={styles.statementTop}>
          <span>
            02 / Why HomeLink
          </span>

          <ShieldCheck aria-hidden="true" />
        </div>

        <div className={styles.statementMain}>
          <h2>
            Less searching.
            <br />

            <span>
              More knowing.
            </span>
          </h2>

          <div className={styles.statementCopy}>
            <p>
              HomeLink is designed to make discovery
              clearer before you ever need to contact
              someone.
            </p>

            <Link
              href="/safety"
              className={styles.statementLink}
            >
              Read our safety guide

              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>


      {/* =====================================================
          PROCESS
      ====================================================== */}

      <section className={styles.processSection}>
        <div className={styles.processHeader}>
          <span className={styles.sectionEyebrow}>
            A simpler flow
          </span>

          <h2>
            See more before
            you make a move.
          </h2>
        </div>


        <div className={styles.processGrid}>
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className={styles.processItem}
              >
                <div className={styles.processItemTop}>
                  <span>
                    {step.number}
                  </span>

                  <Icon aria-hidden="true" />
                </div>

                <h3>
                  {step.title}
                </h3>

                <p>
                  {step.text}
                </p>
              </article>
            );
          })}
        </div>

        <div className={styles.processFooter}>
          <p>
            HomeLink helps you discover and compare.
            You still choose who to contact and when
            to move forward.
          </p>

          <Link
            href="/safety"
            className={styles.darkTextLink}
          >
            Safety guide

            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>


      {/* =====================================================
          MARKETPLACE
      ====================================================== */}

      <section className={styles.marketSection}>
        <div className={styles.marketCopy}>
          <span className={styles.marketEyebrow}>
            Student marketplace
          </span>

          <h2>
            Good stuff deserves
            another home.
          </h2>

          <p>
            Buy useful things from people around campus,
            or turn what you no longer need into someone
            else&apos;s next find.
          </p>

          <div className={styles.marketBenefits}>
            <span>
              <Check aria-hidden="true" />
              Two free listings
            </span>

            <span>
              <Check aria-hidden="true" />
              Photos and short video
            </span>

            <span>
              <Check aria-hidden="true" />
              Moderated before publishing
            </span>
          </div>

          <div className={styles.marketActions}>
            <Link
              href="/marketplace"
              className={styles.marketPrimary}
            >
              Browse marketplace

              <ArrowRight aria-hidden="true" />
            </Link>

            <Link
              href="/post-listing/marketplace"
              className={styles.marketSecondary}
            >
              Sell something
            </Link>
          </div>
        </div>


        <div className={styles.marketBoard}>
          <div className={styles.marketBoardTop}>
            <div>
              <span>
                Around campus
              </span>

              <strong>
                Fresh finds
              </strong>
            </div>

            <Store aria-hidden="true" />
          </div>

          <div className={styles.marketItems}>
            {marketplaceItems.map((item) => (
              <article
                key={item.name}
                className={styles.marketItem}
              >
                <span className={styles.marketNumber}>
                  {item.number}
                </span>

                <div className={styles.marketItemCopy}>
                  <small>
                    {item.category}
                  </small>

                  <strong>
                    {item.name}
                  </strong>
                </div>

                <span className={styles.marketPrice}>
                  {item.price}
                </span>

                <span className={styles.marketArrow}>
                  <ArrowRight aria-hidden="true" />
                </span>
              </article>
            ))}
          </div>

          <Link
            href="/marketplace"
            className={styles.marketViewAll}
          >
            View marketplace

            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>


      {/* =====================================================
          FINAL CTA
      ====================================================== */}

      <section className={styles.ctaSection}>
        <div
          className={styles.ctaGlowOne}
          aria-hidden="true"
        />

        <div
          className={styles.ctaGlowTwo}
          aria-hidden="true"
        />

        <div className={styles.ctaInner}>
          <div className={styles.ctaCopy}>
            <span>
              HomeLink · Around OOU
            </span>

            <h2>
              Find what you need.
              Stay closer to home.
            </h2>

            <p>
              Start with rentals, property or
              the student marketplace.
            </p>
          </div>

          <div className={styles.ctaActions}>
            <Link
              href="/rentals"
              className={styles.ctaPrimary}
            >
              Start exploring

              <ArrowRight aria-hidden="true" />
            </Link>

            <Link
              href="/register"
              className={styles.ctaSecondary}
            >
              Create account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}