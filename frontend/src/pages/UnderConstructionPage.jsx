import { HardHat } from 'lucide-react'
import './Reports.css'

export default function UnderConstructionPage({ label, title, description }) {
    return (
        <main className="reports-page">
            <section className="reports-content" aria-labelledby="construction-heading">
                <div className="reports-copy">
                    <p className="reports-eyebrow">{label}</p>
                    <h1 id="construction-heading">{title}</h1>
                    <p className="reports-description">{description}</p>
                    <div className="reports-status">
                        <span className="reports-status-dot" />
                        <span>Arbetet pågår</span>
                    </div>
                </div>

                <div className="reports-scene" role="img" aria-label="Animerad byggarbetsplats med bygghjälm">
                    <div className="reports-sun" />
                    <div className="reports-scaffold reports-scaffold-back">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className="reports-scaffold reports-scaffold-front">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className="reports-platform" />
                    <div className="reports-hardhat">
                        <HardHat size={78} strokeWidth={1.6} />
                    </div>
                    <div className="reports-ground" />
                    <div className="reports-tape" />
                </div>
            </section>
        </main>
    )
}