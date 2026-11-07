import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Polityka prywatności — Petvio',
  description: 'Polityka prywatności aplikacji Petvio — jak przetwarzamy i chronimy Twoje dane.',
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-serif text-xl sm:text-2xl font-normal text-gray-900">{title}</h2>
    <div className="text-sm sm:text-[15px] text-gray-600 leading-relaxed space-y-2">{children}</div>
  </section>
);

export default function PolitykaPrywatnosci() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <Image src="/logo.png" alt="Petvio" width={110} height={110} className="object-contain" priority />
          </Link>
          <Link href="/login" className="px-4 py-2 bg-brand-dark text-white text-sm font-semibold rounded-full hover:bg-brand transition-colors">
            Zaloguj się
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 sm:py-14 space-y-10">
        <div>
          <span className="inline-block px-4 py-1.5 bg-brand-mint text-brand-dark text-xs font-semibold rounded-full mb-4 tracking-wide">
            DOKUMENT
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-gray-900 mb-3">Polityka prywatności</h1>
          <p className="text-sm text-gray-500">Ostatnia aktualizacja: 23 października 2026 r.</p>
        </div>

        <Section title="1. Administrator danych">
          <p>
            Administratorem danych osobowych użytkowników aplikacji Petvio (serwis petvio.pl oraz
            aplikacja mobilna, zwane dalej „Aplikacją") jest Petvio. Kontakt z administratorem
            możliwy jest pod adresem e-mail: <a href="mailto:kontakt@petvio.pl" className="text-brand-dark underline">kontakt@petvio.pl</a>.
          </p>
        </Section>

        <Section title="2. Jakie dane zbieramy">
          <p><strong>Dane konta:</strong> imię i nazwisko, adres e-mail, hasło (przechowywane wyłącznie w formie zaszyfrowanej), opcjonalnie zdjęcie profilowe, miasto, data urodzin oraz bio.</p>
          <p><strong>Dane o zwierzętach:</strong> imię, gatunek, rasa, wiek, waga, zdjęcia, dane zdrowotne (szczepienia, leki, wizyty weterynaryjne, książeczka zdrowia), dane żywieniowe.</p>
          <p><strong>Dane aktywności:</strong> trasy spacerów wraz z danymi GPS (położenie, dystans, czas, tempo), aktywności treningowe i statystyki.</p>
          <p><strong>Dane społecznościowe:</strong> posty, zdjęcia, filmy (rolki), relacje, komentarze, reakcje, wiadomości prywatne, członkostwo w grupach, relacje znajomości i obserwowania.</p>
          <p><strong>Dane techniczne:</strong> adres IP, typ urządzenia i przeglądarki, dane o sesji, pliki cookies oraz dane w pamięci lokalnej (localStorage — token sesji).</p>
        </Section>

        <Section title="3. Cele i podstawy przetwarzania">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>świadczenie usług Aplikacji (art. 6 ust. 1 lit. b RODO) — prowadzenie konta, książeczki zdrowia, trackera spacerów, funkcji społecznościowych;</li>
            <li>przesyłanie powiadomień i przypomnień zdrowotnych (art. 6 ust. 1 lit. b i f RODO);</li>
            <li>realizacja zamówień w zakładce Sklep — sprzedawcą i administratorem transakcji jest sklep partnerski Przystań Pupila (szczegóły w pkt. 5);</li>
            <li>zapewnienie bezpieczeństwa, przeciwdziałanie nadużyciom oraz dochodzenie roszczeń (art. 6 ust. 1 lit. f RODO);</li>
            <li>obowiązki prawne, np. podatkowe i rachunkowe (art. 6 ust. 1 lit. c RODO).</li>
          </ul>
        </Section>

        <Section title="4. Dane o lokalizacji">
          <p>
            Funkcja trackera spacerów korzysta z lokalizacji urządzenia wyłącznie po wyrażeniu zgody
            (uprawnienie systemowe/przeglądarkowe). Trasy GPS są zapisywane na koncie użytkownika i
            widoczne tylko dla niego, chyba że użytkownik dobrowolnie udostępni spacer w poście
            społecznościowym. Lokalizację można wyłączyć w każdej chwili w ustawieniach urządzenia —
            pozostałe funkcje Aplikacji działają bez niej.
          </p>
        </Section>

        <Section title="5. Odbiorcy danych">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Przystań Pupila</strong> — sklep partnerski. Zamówienia i płatności realizowane są w całości po stronie sklepu przystan-pupila.pl; Petvio nie przetwarza płatności. Dane podane w zamówieniu (imię, e-mail, adres dostawy, telefon) trafiają wyłącznie do sklepu w celu realizacji zamówienia.</li>
            <li><strong>Przelewy24</strong> — operator płatności sklepu Przystań Pupila (Petvio nie jest stroną transakcji).</li>
            <li><strong>OpenStreetMap / Nominatim / OSRM</strong> — geokodowanie adresów i trasy (przekazywany jest adres lub współrzędne, bez danych osobowych).</li>
            <li><strong>Dostawcy infrastruktury</strong> — hosting i utrzymanie serwerów.</li>
            <li><strong>Resend</strong> — dostarczanie wiadomości e-mail (adres e-mail odbiorcy).</li>
          </ul>
          <p>Dane nie są sprzedawane ani udostępniane podmiotom trzecim w celach marketingowych.</p>
        </Section>

        <Section title="6. Okres przechowywania">
          <p>
            Dane przechowujemy przez czas posiadania konta oraz przez okres wymagany przepisami
            prawa (np. rozliczeniowym). Po usunięciu konta dane osobowe usuwane są bez zbędnej
            zwłoki, z wyjątkiem danych, których przechowywanie wymagają przepisy prawa.
          </p>
        </Section>

        <Section title="7. Twoje prawa">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>dostęp do danych i ich sprostowanie,</li>
            <li>usunięcie danych („prawo do bycia zapomnianym"),</li>
            <li>ograniczenie przetwarzania i sprzeciw,</li>
            <li>przeniesienie danych,</li>
            <li>wniesienie skargi do Prezesa Urzędu Ochrony Danych Osobowych (uodo.gov.pl).</li>
          </ul>
          <p>W tych sprawach napisz na <a href="mailto:kontakt@petvio.pl" className="text-brand-dark underline">kontakt@petvio.pl</a>.</p>
        </Section>

        <Section title="8. Cookies i pamięć lokalna">
          <p>
            Aplikacja używa cookies oraz pamięci lokalnej przeglądarki wyłącznie do celów
            niezbędnych do działania usługi (utrzymanie sesji, preferencje). Nie stosujemy
            śledzących plików cookies stron trzecich ani reklamowych.
          </p>
        </Section>

        <Section title="9. Bezpieczeństwo">
          <p>
            Hasła przechowywane są w formie zaszyfrowanej, połączenie z Aplikacją jest szyfrowane
            (HTTPS), a dostęp do danych mają wyłącznie osoby upoważnione. Mimo stosowania
            najlepszych praktyk żadna metoda transmisji w internecie nie zapewnia 100% ochrony.
          </p>
        </Section>

        <Section title="10. Dzieci">
          <p>
            Aplikacja nie jest kierowana do dzieci poniżej 16 roku życia. Osoby młodsze mogą
            korzystać z Aplikacji wyłącznie pod nadzorem opiekuna prawnego.
          </p>
        </Section>

        <Section title="11. Zmiany polityki">
          <p>
            O istotnych zmianach niniejszej polityki poinformujemy w Aplikacji lub e-mailem.
            Aktualna wersja dokumentu jest zawsze dostępna pod adresem
            petvio.pl/polityka-prywatnosci.
          </p>
        </Section>

        <div className="pt-6 border-t border-gray-200">
          <Link href="/" className="text-brand-dark text-sm font-semibold hover:underline">← Wróć na stronę główną</Link>
        </div>
      </main>
    </div>
  );
}
