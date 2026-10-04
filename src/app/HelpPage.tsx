import {
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  ExternalLink,
  LayoutDashboard,
  ListPlus,
  ListTodo,
  Settings,
  Smartphone,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ContainedDialog } from "../components/ContainedDialog/ContainedDialog";
import styles from "./Shell.module.css";

interface GuideSection {
  body?: ReactNode;
  steps?: ReactNode[];
  title: string;
}

interface GuideTopic {
  description: string;
  destination?: { href: string; label: string };
  icon: LucideIcon;
  sections: GuideSection[];
  title: string;
}

const topics: GuideTopic[] = [
  {
    title: "Footy",
    description: "Schedules, followed teams, filters, and match alerts.",
    icon: CalendarDays,
    destination: { href: "#footy", label: "Open Footy" },
    sections: [
      {
        title: "See your schedule",
        steps: [
          <>
            Select <strong>Footy</strong> in the top navigation.
          </>,
          <>
            Select a team logo to open that team’s schedule, roster, and player
            details.
          </>,
          <>
            Use <strong>Past Matches</strong> for completed fixtures, the trophy
            button for a competition schedule, or the filter button to search by
            date, competition, team, and match type.
          </>,
        ],
      },
      {
        title: "Build a temporary custom schedule",
        body: (
          <>
            Select the calendar-plus button, choose any combination of teams,
            and confirm. You can then filter the combined fixture list without
            changing the teams you permanently follow.
          </>
        ),
      },
      {
        title: "Get match alerts",
        body: (
          <>
            Select the bell button and allow notifications when prompted. Alerts
            are set separately on every device and use the followed teams saved
            to your account.
          </>
        ),
      },
    ],
  },
  {
    title: "Next",
    description: "A dated view of what is coming up across the site.",
    icon: ListTodo,
    destination: { href: "#next", label: "Open Next" },
    sections: [
      {
        title: "Use the list",
        steps: [
          <>
            Select <strong>Next</strong> in the top navigation.
          </>,
          <>
            Items are ordered around their scheduled date and time. Artwork,
            countdown information, and priority styling identify what is
            closest.
          </>,
          <>
            Use the filter button to narrow the list. Completed-item and editing
            controls are reserved for the administrator.
          </>,
        ],
      },
      {
        title: "Put Next on your iPhone",
        body: (
          <>
            The medium widget focuses on one chosen item. The large widget lists
            up to six upcoming items. Open <strong>Home Screen Widgets</strong>{" "}
            in this guide for setup.
          </>
        ),
      },
    ],
  },
  {
    title: "Rankings",
    description: "Your game and movie rankings, comparisons, and snapshots.",
    icon: ChartNoAxesColumnIncreasing,
    destination: { href: "#rankings", label: "Open Rankings" },
    sections: [
      {
        title: "Rank an item",
        steps: [
          <>
            Log in, select <strong>Rankings</strong>, and choose Games or
            Movies.
          </>,
          <>
            Open the head-to-head comparison and choose the item you prefer in
            each matchup.
          </>,
          <>
            Finish the comparison session to save the choices into your ranking.
          </>,
        ],
      },
      {
        title: "Review your data",
        body: (
          <>
            Filters can show archived or excluded entries. Snapshot and
            comparison controls show how a ranking changed over time. Ranking
            data belongs to the signed-in manager.
          </>
        ),
      },
    ],
  },
  {
    title: "Leagues and Competitions",
    description: "World Cup, Formula 1, Fantasy Critic, and Fantasy Office.",
    icon: Trophy,
    destination: { href: "#leagues", label: "Open Leagues" },
    sections: [
      {
        title: "Find a competition",
        steps: [
          <>
            Select <strong>Leagues</strong> in the top navigation.
          </>,
          <>Choose a league card and year.</>,
          <>
            Use that competition’s top navigation for questions, weekly picks,
            drafts, movies, brackets, standings, or results.
          </>,
        ],
      },
      {
        title: "Submit an entry",
        body: (
          <>
            Log in, open the questions or weekly-picks page, complete every
            required field, and submit before the displayed deadline. Return to
            the same page to review or edit while the entry remains open.
          </>
        ),
      },
    ],
  },
  {
    title: "Manager Hub",
    description: "Your notifications, results, awards, and personal tools.",
    icon: LayoutDashboard,
    destination: { href: "#manager-hub", label: "Open Manager Hub" },
    sections: [
      {
        title: "Open your dashboard",
        steps: [
          <>Log in and select your name in the upper-right corner.</>,
          <>
            Select <strong>Manager Hub</strong>.
          </>,
          <>
            Expand Notifications to see entries or decisions that need
            attention. Select one to go directly to its page.
          </>,
        ],
      },
      {
        title: "Results and awards",
        body: (
          <>
            Results summarizes your competition finishes; change the year for
            older seasons. Awards shows recent honors, and the trophy button
            opens the complete award history.
          </>
        ),
      },
      {
        title: "Personal tools",
        body: (
          <>
            The heading buttons open Daily Workouts, Draft List, and League
            Awards.
          </>
        ),
      },
    ],
  },
  {
    title: "Draft List",
    description: "Private ranked lists for games, movies, and other drafts.",
    icon: ListPlus,
    destination: { href: "#draft-list", label: "Open Draft List" },
    sections: [
      {
        title: "Create and organize a list",
        steps: [
          <>
            Open <strong>Manager Hub</strong> and select the list-plus button.
          </>,
          <>
            Use the book-plus button to create another sheet; tabs switch
            between sheets.
          </>,
          <>
            Select plus to add a name, release date, rank, link, image, and
            optional notes.
          </>,
          <>
            Drag an item by its handle to reorder it. Use its action buttons to
            edit it or open its saved link.
          </>,
        ],
      },
      {
        title: "Filter statuses",
        body: (
          <>
            The filter button can show drafted, unavailable, or archived entries
            and limit the list by entry date. Every sheet belongs to the
            signed-in manager.
          </>
        ),
      },
    ],
  },
  {
    title: "Daily Workouts",
    description: "Choose a day, complete a routine, and review your history.",
    icon: Dumbbell,
    destination: { href: "#workouts", label: "Open Daily Workouts" },
    sections: [
      {
        title: "Record a workout",
        steps: [
          <>
            Open <strong>Manager Hub</strong> and select the dumbbell button.
          </>,
          <>
            Choose today on the calendar, or choose a previous date to review
            it.
          </>,
          <>
            Choose Morning Stretch, Kettlebell, Cardio, or Knee. The colored
            calendar marker shows which parts you completed that day.
          </>,
        ],
      },
      {
        title: "Configure Morning Stretch",
        body: (
          <>
            Morning Stretch follows an ordered list of timers and counted
            exercises. Timers advance automatically when they end. Counted
            exercises can use one completion toggle or tally every repetition.
            Use the sunrise control above the calendar to customize your
            routine; administrators can also maintain the default routine.
          </>
        ),
      },
      {
        title: "View statistics",
        body: (
          <>
            Use the statistics controls to review your recent activity and
            trends. You can only edit workout history attached to your login.
          </>
        ),
      },
    ],
  },
  {
    title: "Guides",
    description: "Step-by-step game checklists with saved progress.",
    icon: BookOpen,
    destination: { href: "#guides", label: "Open Guides" },
    sections: [
      {
        title: "Track a guide",
        steps: [
          <>
            Log in, select your name, and choose <strong>Guides</strong>.
          </>,
          <>
            Open a game guide and check a step when it is complete. Progress
            saves to your account.
          </>,
          <>
            Filter by section or step type, and hide completed steps to focus on
            what remains.
          </>,
          <>
            Expand grouped steps when a task has smaller requirements underneath
            it.
          </>,
        ],
      },
    ],
  },
  {
    title: "Account Settings",
    description: "Followed teams, appearance, offline images, and version.",
    icon: Settings,
    destination: { href: "#account-settings", label: "Open Account Settings" },
    sections: [
      {
        title: "Change followed teams",
        steps: [
          <>
            Log in, select your name, and choose{" "}
            <strong>Account Settings</strong>.
          </>,
          <>
            Select <strong>Add teams</strong>, choose and arrange teams, then
            save.
          </>,
          <>
            Select <strong>Reset to default</strong> to use the shared team list
            again.
          </>,
        ],
      },
      {
        title: "Appearance and offline images",
        body: (
          <>
            Switch between dark and light themes. <strong>Save images</strong>{" "}
            keeps artwork on this device for offline use;{" "}
            <strong>Purge images</strong> removes that cache.
          </>
        ),
      },
      {
        title: "Notifications",
        body: (
          <>
            Followed Teams determines which Footy matches are eligible for
            alerts. Return to Footy and select its bell button to enable alerts
            on the current device.
          </>
        ),
      },
    ],
  },
  {
    title: "Home Screen Widgets",
    description: "Install the Footy, Formula 1, and Next iPhone widgets.",
    icon: Smartphone,
    sections: [
      {
        title: "First-time setup on iPhone",
        steps: [
          <>
            Install the free <strong>Scriptable</strong> app.
          </>,
          <>
            Create a script named <strong>Box This Lap Widget Loader</strong>.
          </>,
          <>
            Open the installer code below, select <strong>Raw</strong>, copy
            everything, paste it into the new script, and save.
          </>,
          <>
            Run the loader and select <strong>Install or update all</strong>.
          </>,
          <>
            Add a Scriptable widget to the Home Screen, edit it, and choose a
            Box This Lap script.
          </>,
          <>
            Set <strong>When Interacting</strong> to <strong>Run Script</strong>
            .
          </>,
        ],
        body: (
          <a
            className={styles.guideExternalLink}
            href="https://github.com/wyattjones-wnc/boxthislap/blob/main/scriptable/box-this-lap-widget-loader.js"
            target="_blank"
            rel="noreferrer"
          >
            Open widget installer code <ExternalLink aria-hidden="true" />
          </a>
        ),
      },
      {
        title: "Footy widget",
        body: (
          <>
            Medium shows the next three matches; large shows the next eight. Run{" "}
            <strong>Box This Lap Footy</strong> in Scriptable to choose the
            shared schedule or a manager with saved followed teams. Run it again
            to change the choice.
          </>
        ),
      },
      {
        title: "Formula 1 widget",
        body: (
          <>
            Small shows the next race, medium the next three, and large the next
            six. Times use the phone’s time zone; the bet deadline is qualifying
            start. <strong>CACHED</strong> means the last successful schedule is
            displayed.
          </>
        ),
      },
      {
        title: "Next widget",
        body: (
          <>
            Medium shows one countdown; run <strong>Box This Lap Next</strong>{" "}
            to choose it. Large shows up to six upcoming incomplete items. Both
            default to items intended for non-managers.
          </>
        ),
      },
      {
        title: "Update or troubleshoot",
        body: (
          <>
            Run the loader again to update the widgets or loader. After an
            update, remove an existing Home Screen widget and add it again once
            so iOS releases its old tap action. iOS controls automatic refresh
            timing; tapping a widget runs its script and refreshes the preview.
          </>
        ),
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <div
        className={`section-heading ${styles.modernPageHeading} ${styles.helpHeading}`}
      >
        <h1>Site Guide</h1>
      </div>
      <div className={styles.helpGrid}>
        {topics.map((topic) => (
          <TopicDialog key={topic.title} topic={topic} />
        ))}
      </div>
    </>
  );
}

function TopicDialog({ topic }: { topic: GuideTopic }) {
  const Icon = topic.icon;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={styles.helpFeatureCard}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className={styles.helpFeatureIcon} aria-hidden="true">
          <Icon />
        </span>
        <span className={styles.helpFeatureCopy}>
          <strong>{topic.title}</strong>
          <span>{topic.description}</span>
        </span>
      </button>
      {open ? (
        <ContainedDialog
          bodyClassName={styles.guideDialogBody}
          close={() => setOpen(false)}
          description={topic.description}
          title={topic.title}
        >
          {topic.sections.map((section) => (
            <section className={styles.guideSection} key={section.title}>
              <h3>{section.title}</h3>
              {section.steps ? (
                <ol className={styles.guideSteps}>
                  {section.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              ) : null}
              {section.body ? <p>{section.body}</p> : null}
            </section>
          ))}
          {topic.destination ? (
            <a
              className="action-button"
              href={topic.destination.href}
              onClick={() => setOpen(false)}
            >
              {topic.destination.label}
            </a>
          ) : null}
        </ContainedDialog>
      ) : null}
    </>
  );
}
