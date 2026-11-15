import { useLocation } from 'react-router-dom'
import bg from '../assets/login-bg.jpg'
import LoginPanel from '../components/LoginPanel'
import { MOBILE_BASE_PATH, isMobilePath } from './mobileRouting'

export default function MobileLogin() {
    const location = useLocation()
    const fromPath = location.state?.from?.pathname
    const redirectTo = fromPath && isMobilePath(fromPath) && fromPath !== `${MOBILE_BASE_PATH}/login`
        ? fromPath
        : MOBILE_BASE_PATH

    return (
        <main className="relative min-h-dvh overflow-hidden bg-[#141820] text-stone-50">
            {/* Landscape uses the desktop look. A CSS background keeps portrait from downloading the image. */}
            <div
                aria-hidden="true"
                className="absolute inset-0 hidden bg-cover bg-center landscape:block"
                style={{ backgroundImage: `url(${bg})` }}
            />
            <div aria-hidden="true" className="absolute inset-0 hidden bg-[#02040a]/55 landscape:block" />

            <div className="relative flex min-h-dvh flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] landscape:flex-row landscape:items-stretch landscape:pt-6 landscape:pr-[max(1.5rem,env(safe-area-inset-right))] landscape:pb-[max(1.5rem,env(safe-area-inset-bottom))] landscape:pl-[max(env(safe-area-inset-left),min(25vw,22.5rem))] mobile-compact:pt-3 mobile-compact:pr-[max(0.75rem,env(safe-area-inset-right))] mobile-compact:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <section className="flex flex-1 flex-col landscape:w-[40%] landscape:max-w-[500px] landscape:min-w-[min(100%,26rem)] landscape:flex-none landscape:rounded-2xl landscape:border landscape:border-white/10 landscape:bg-[#141820]/96 landscape:p-8 landscape:shadow-[0_35px_80px_rgba(0,0,0,0.45)] landscape:backdrop-blur-sm mobile-compact:px-6 mobile-compact:py-3">
                    <LoginPanel redirectTo={redirectTo} />
                </section>
            </div>
        </main>
    )
}
