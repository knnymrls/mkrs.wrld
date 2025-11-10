import Link from "next/link"
import { Button } from "../components/ui/button"

const eveningFlow = [
  {
    time: "5:30 PM",
    title: "Arrivals",
    description: "Soft opening, introductions, and networking.",
  },
  {
    time: "5:45 PM",
    title: "Kickoff",
    description: "A brief introduction to the event and the purpose of the evening."
  },
  {
    time: "6:00 PM",
    title: "Catered Dinner",
    description: "",
  },
  {
    time: "6:45 PM",
    title: "Guided Networking",
    description: "Bringing together people who should already know each other.",
  },
  {
    time: "7:20 PM",
    title: "Goodbyes",
    description: "A final share-out of resources, collaborators, and next steps.",
  },
]

const labelClass =
  "text-[0.65rem] uppercase tracking-[0.35em] font-medium text-foreground/40 leading-[1.2]"

export default function EventPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-6 pt-8 pb-6 md:px-12 md:pt-10">
        <div className="flex justify-end">
          <Link
            href="https://mkrs.world"
            className="text-[1.1rem] font-medium leading-tight text-foreground/80 transition-colors hover:text-foreground md:text-[1.3rem]"
            aria-label="Visit mkrs.world"
          >
            mkrs.
          </Link>
        </div>
      </div>
      <main className="mx-auto flex max-w-5xl flex-col gap-28 px-6 pb-16 md:gap-32 md:px-12 md:pb-24">
        <section className="flex min-h-[80vh] items-center py-12 md:py-20">
          <div className="flex w-full flex-col gap-12">
            <div className="space-y-6 text-left">
              <p className="text-[0.7rem] uppercase tracking-[0.35em] font-medium text-foreground/40 md:text-[0.75rem]">
                you are invited to
              </p>
              <h1 className="text-[clamp(3rem,8vw,5.5rem)] font-bold leading-[0.95] tracking-tight text-foreground">
                mkrs.link
              </h1>
              <p className="max-w-2xl text-[1.05rem] font-normal leading-[1.65] text-foreground/70 md:text-[1.15rem]">
                A curated dinner and networking event to inspire collisions, collaboration, and entrepreneurship among the most talented Nebraska youth.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.75rem] font-medium uppercase tracking-[0.15em] text-foreground/70 md:text-[0.8rem]">
              <p>Tuesday, December 2</p>
              <span className="text-foreground/30">•</span>
              <p>5:30–7:30 PM</p>
              <span className="text-foreground/30">•</span>
              <Link
                href="https://www.talonroom.com/"
                className="underline decoration-foreground/20 underline-offset-4 transition-all duration-200 hover:text-foreground hover:decoration-foreground/60"
              >
                The Talon Room
              </Link>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-lg bg-primary px-8 text-[0.9rem] font-semibold tracking-wide text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md md:w-auto"
              >
                <Link href="https://joinfindu.notion.site/29961be0720380da9367c189939d675f?pvs=105" target="_blank" rel="noreferrer">
                  Accept invite
                </Link>
              </Button>
              <p className="text-[0.85rem] text-foreground/50">Limited seats • invitation only</p>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <p className={labelClass}>event purpose</p>
          <div className="max-w-3xl space-y-6">
            <p className="text-[1rem] leading-[1.7] text-foreground/75 md:text-[1.05rem]">
              Connect with the next generation of doers shaping Nebraska's future. We're bringing together talented builders from Lincoln, Omaha, and across the state who don't usually end up in the same rooms: first-time founders, designers, indie creatives, researchers, artists, and product-minded students who are already making things happen.
            </p>
            <p className="text-[1rem] leading-[1.7] text-foreground/75 md:text-[1.05rem]">
              The goal is simple: close the distance between people who should know each other. Some are running businesses. Some are creating art. Some are sketching out ideas that aren't public yet. All of them are serious about their craft.
            </p>
          </div>
        </section>

        <section className="space-y-8">
          <p className={labelClass}>evening flow</p>
          <div className="divide-y divide-border/50 rounded-lg border border-border/50">
            {eveningFlow.map(({ time, title, description }) => (
              <div
                key={`${time}-${title}`}
                className="flex flex-col gap-4 p-7 transition-colors hover:bg-foreground/[0.02] md:flex-row md:items-start md:gap-10 md:p-8"
              >
                <p className="text-[0.7rem] uppercase tracking-[0.25em] font-medium text-foreground/50 md:min-w-[8rem] md:text-[0.75rem]">{time}</p>
                <div className="flex-1 space-y-2">
                  <p className="text-[1.4rem] font-semibold leading-tight tracking-tight text-foreground md:text-[1.5rem]">{title}</p>
                  {description && <p className="text-[0.95rem] leading-[1.65] text-foreground/65">{description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="rsvp" className="space-y-6 rounded-lg border border-dashed border-border/60 bg-foreground/[0.015] px-8 py-10 md:px-10 md:py-12">
          <p className={labelClass}>rsvp protocol</p>
          <p className="max-w-2xl text-[1rem] leading-[1.7] text-foreground/70 md:text-[1.05rem]">
            Interested in attending? Submit a short form with your info so we can save a spot for you.
          </p>
          <Button
            asChild
            size="lg"
            className="h-12 rounded-lg bg-primary px-8 text-[0.9rem] font-semibold tracking-wide text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            <Link href="https://joinfindu.notion.site/29961be0720380da9367c189939d675f?pvs=105" target="_blank" rel="noreferrer">
              Accept invite
            </Link>
          </Button>
        </section>

        <section className="space-y-5 rounded-lg border border-border/50 px-8 py-9 text-left md:px-10">
          <p className={labelClass}>contact</p>
          <p className="text-[0.95rem] leading-[1.7] text-foreground/70 md:text-[1rem]">
            Questions about the event? Reach out anytime at{" "}
            <Link
              href="mailto:team@mkrsstudio.com"
              className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 transition-all hover:text-foreground/90 hover:decoration-foreground/50"
            >
              team@mkrsstudio.com
            </Link>
            .
          </p>
        </section>

        <footer className="border-t border-border/40 pt-12 text-center">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.3em] text-foreground/30">mkrs.</p>
        </footer>
      </main>
    </div>
  )
}
