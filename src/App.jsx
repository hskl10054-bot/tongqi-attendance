import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import StaffPage    from './pages/StaffPage'
import AdminPage    from './pages/AdminPage'
import ImportPage   from './pages/ImportPage'
import FieldworkPage from './pages/FieldworkPage'
import PayrollPage  from './pages/PayrollPage'
import LeavePage    from './pages/LeavePage'
import { Clock, LayoutDashboard, Upload, MapPin, DollarSign, Calendar } from 'lucide-react'

// ─── 底部導航（行動版）────────────────────────────────────────────────────────
function BottomNav() {
  const links = [
    { to: '/',         label: '打卡',  icon: <Clock size={20}/>          },
    { to: '/admin',    label: '管理',  icon: <LayoutDashboard size={20}/> },
    { to: '/import',   label: '匯入',  icon: <Upload size={20}/>         },
    { to: '/fieldwork',label: '外勤',  icon: <MapPin size={20}/>         },
    { to: '/payroll',  label: '薪資',  icon: <DollarSign size={20}/>     },
    { to: '/leave',    label: '假別',  icon: <Calendar size={20}/>       },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40 md:hidden">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition
            ${isActive ? 'text-emerald-600 font-bold' : 'text-gray-400'}`
          }
        >
          {l.icon}
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}

// ─── 頂部導航（桌面版 — 僅在非 Admin 頁面顯示）──────────────────────────────
function TopBar() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin')) return null  // Admin 有自己的側邊欄

  return (
    <header className="hidden md:flex bg-white border-b px-6 py-3 items-center justify-between sticky top-0 z-30">
      <span className="font-bold text-emerald-700 text-lg">裕綸集團</span>
      <nav className="flex gap-1">
        {[
          { to: '/',          label: '員工打卡' },
          { to: '/admin',     label: '管理後台' },
          { to: '/import',    label: '硬體匯入' },
          { to: '/fieldwork', label: '外勤回報' },
          { to: '/payroll',   label: '薪資計算' },
          { to: '/leave',     label: '假別管理' },
        ].map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen bg-slate-50">
          <TopBar/>
          <main className="pb-16 md:pb-0">
            <Routes>
              <Route path="/"          element={<StaffPage/>}    />
              <Route path="/admin"     element={<AdminPage/>}    />
              <Route path="/import"    element={<ImportWrap/>}   />
              <Route path="/fieldwork" element={<FieldworkPage/>}/>
              <Route path="/payroll"   element={<PayrollPage/>}  />
              <Route path="/leave"     element={<LeavePage/>}    />
              <Route path="*"          element={<NotFound/>}     />
            </Routes>
          </main>
          <BottomNav/>
        </div>
      </HashRouter>
    </AppProvider>
  )
}

function ImportWrap() {
  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <ImportPage/>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-400">
      <div className="text-6xl font-bold">404</div>
      <p className="mt-2">找不到這個頁面</p>
      <a href="#/" className="mt-4 text-emerald-600 hover:underline">← 回到首頁</a>
    </div>
  )
}
