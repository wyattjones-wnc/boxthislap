import { useLayoutEffect } from "react";
import { Boxes, Database, Gamepad2, Images, ShoppingBag } from "lucide-react";

function Skeletons({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <span className="platinum-skeleton" key={index} />
  ));
}

export function AdminHomePage() {
  useLayoutEffect(() => {
    window.dispatchEvent(new Event("boxthislap:admin-home-ready"));
  }, []);
  return (
    <>
      <div className="admin-home-title">
        <p className="eyebrow">TheMonsterManiac</p>
        <h1>Admin Home</h1>
      </div>
      <section
        className="admin-trophy-case"
        aria-labelledby="admin-trophy-case-heading"
      >
        <div className="admin-section-heading">
          <h2 id="admin-trophy-case-heading">Trophy Case</h2>
          <a href="#trophy-log" data-page-link="trophy-log">
            Manage
          </a>
        </div>
        <div
          className="admin-trophy-case-grid"
          id="admin-featured-platinums-grid"
          aria-live="polite"
          aria-busy="true"
        >
          <Skeletons count={3} />
        </div>
      </section>
      <section className="admin-tools" aria-labelledby="admin-tools-heading">
        <h2 id="admin-tools-heading">Tools</h2>
        <div className="admin-tools-grid">
          <a
            className="admin-tool-card"
            href="#image-editor"
            data-page-link="image-editor"
          >
            <Images aria-hidden="true" />
            <span>
              <strong>Image Studio</strong>
              <small>
                Layered editor, shared images, crop presets, and cloud safety
                limits
              </small>
            </span>
          </a>
          <a className="admin-tool-card" href="#psn" data-page-link="psn">
            <Gamepad2 aria-hidden="true" />
            <span>
              <strong>PSN</strong>
              <small>Trophies, stats, and PlayStation access</small>
            </span>
          </a>
          <a
            className="admin-tool-card"
            href="#collectibles"
            data-page-link="collectibles"
          >
            <Boxes aria-hidden="true" />
            <span>
              <strong>Collectibles</strong>
              <small>Collection checklist and catalog</small>
            </span>
          </a>
          <a
            className="admin-tool-card"
            href="#database-admin"
            data-page-link="database-admin"
          >
            <Database aria-hidden="true" />
            <span>
              <strong>Database Explorer</strong>
              <small>Inspect schemas, browse rows, and make corrections</small>
            </span>
          </a>
          <a
            className="admin-tool-card"
            href="#merchandise"
            data-page-link="merchandise"
          >
            <ShoppingBag aria-hidden="true" />
            <span>
              <strong>Merchandise</strong>
              <small>Discover products and manage your wishlist</small>
            </span>
          </a>
          <a
            className="admin-tool-card"
            href="#match-images"
            data-page-link="match-images"
          >
            <Images aria-hidden="true" />
            <span>
              <strong>Match Images</strong>
              <small>Discover, review, and save post-match photography</small>
            </span>
          </a>
        </div>
      </section>
    </>
  );
}
