import { Hero } from '../components/Hero';
import { SupportedPlatforms } from '../components/SupportedPlatforms';
import { HowItWorks } from '../components/HowItWorks';
import { FAQ } from '../components/FAQ';

export function HomePage() {
  return (
    <>
      <Hero />
      <SupportedPlatforms />
      <HowItWorks />
      <FAQ />
    </>
  );
}