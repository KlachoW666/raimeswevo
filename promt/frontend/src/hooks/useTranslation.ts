import { useUserStore } from '../store/userStore';

export const translations = {
    ru: {
        nav: {
            home: 'Главная',
            wallet: 'Кошелёк',
            referrals: 'Рефералы',
            stats: 'Статистика',
            settings: 'Настройки'
        },
        auth: {
            enterPin: 'Введите PIN',
            enterPinDesc: 'Введите PIN для входа в приложение.',
            pinPlaceholder: 'Пин-код',
            login: 'Войти',
            wrongPin: 'Неверный PIN-код',
            networkError: 'Ошибка сети. Попробуйте еще раз.'
        },
        settings: {
            account: 'Аккаунт',
            userId: 'ID ПОЛЬЗОВАТЕЛЯ',
            changePin: 'Изменить PIN',
            botMode: 'Режим бота',
            safeMode: 'Безопасный',
            safeModeDesc: 'Меньший риск, небольшие позиции',
            balancedMode: 'Сбалансированный',
            balancedModeDesc: 'Умеренный риск и доход',
            aggressiveMode: 'Высокая прибыль',
            aggressiveModeDesc: 'Выше риск, выше потенциальная прибыль',
            language: 'Язык',
            dangerZone: 'Опасные действия',
            resetDesc: 'Сбросить баланс до начальной суммы (очищает историю сделок).',
            resetBtn: 'Сбросить баланс до $0',
            logout: 'Выход',
            adminPanel: 'Панель администратора',
            resetConfirm: 'Вы уверены, что хотите сбросить баланс до $0? Это очистит историю операций.',
            logoutConfirm: 'Вы уверены, что хотите выйти?',
            resetSuccess: 'Баланс успешно сброшен'
        },
        home: {
            title: 'Вы успешно авторизованы!',
            balance: 'БАЛАНС',
            todayProfit: 'Прибыль за сегодня',
            winrate: 'Винрейт',
            executions: 'Сделок',
            latency: 'Пинг',
            recentTrades: 'ПОСЛЕДНИЕ СДЕЛКИ',
            profit: 'Прибыль',
            loss: 'Убыток',
            noTrades: 'Пока нет сделок',
            tradesLive: 'Сделки',
            time: 'Время',
            pair: 'Пара',
            pnl: 'P&L',
            speed: 'Скорость',
            delay: 'Задержка',
            ns: 'нс',
            execSub: 'Исполнение до 1 мкс',
            executionsTitle: 'Исполнений',
            perSession: 'За сессию',
            avgSpeed: 'Средняя скорость исполнения'
        },
        wallet: {
            availableBalance: 'Доступный баланс',
            expectedDaily: 'Ожид. в день от сделок:',
            deposit: 'Пополнить',
            withdraw: 'Вывести',
            networkBalances: 'Баланс по сетям',
            dailyProfit: 'Прибыль в день',
            dailyProfitDesc: 'Около 5% в день от торговли (зависит от рынка).',
            withdrawLimits: 'Лимиты вывода',
            txHistory: 'История операций',
            noTx: 'Пока нет операций. Используйте «Пополнить» или «Вывести» в шапке.'
        },
        referral: {
            title: 'Ваша реферальная ссылка',
            subtitle: 'Поделитесь ей, чтобы начать зарабатывать',
            yourCode: 'Ваш код:',
            invited: 'Приглашённые',
            clickedLink: 'Перешли по ссылке',
            earned: 'Заработано',
            fromDeposits: '5% от пополнений',
            howItWorks: 'Как это работает:',
            howItWorksDesc: 'Поделитесь ссылкой. Когда человек зарегистрируется и пополнит баланс — вы автоматически получите 5% от суммы в USDT.'
        },
        stats: {
            title: 'Статистика',
            subtitle: 'Прибыль за день, неделю и месяц',
            pnlPeriods: 'Прибыль и убыток по периодам',
            pnlToday: 'P&L за сегодня',
            tradesToday: 'сделок сегодня',
            pnlWeek: 'P&L за неделю',
            for7Days: 'За 7 дней ·',
            tradesText: 'сделок',
            pnlMonth: 'P&L за месяц',
            for30Days: 'За 30 дней ·',
            performance: 'Результативность',
            winrate: 'Винрейт',
            profitableOf: 'в плюс /',
            totalFixed: 'всего'
        },
        deposit: {
            title: 'Пополнить',
            selectNetwork: 'Выберите сеть',
            scanToDeposit: 'Сканируйте для пополнения',
            depositAddress: 'АДРЕС ДЛЯ ПОПОЛНЕНИЯ',
            copy: 'Копировать',
            warning1: 'Отправляйте только',
            warning2: 'на этот адрес. Другие активы могут быть потеряны.'
        },
        withdraw: {
            title: 'Вывести',
            invalidAmount: 'Введите корректную сумму',
            invalidAddress: 'Введите адрес кошелька',
            success: 'Заявка на вывод успешно создана',
            error: 'Ошибка вывода',
            networkError: 'Произошла ошибка сети',
            selectNetwork: 'Выберите сеть',
            amountUsd: 'Сумма (USD)',
            available: 'Доступно:',
            max: 'Макс',
            minMaxDaily: 'Мин ${min} · макс ${max} в день',
            remainingToday: 'Осталось сегодня:',
            walletAddress: 'Адрес кошелька',
            cancel: 'Отмена',
            withdrawBtn: 'Вывести',
            addressPlaceholder: 'Адрес...'
        },
        admin: {
            accessDenied: 'Доступ запрещен',
            adminsOnly: 'Эта страница доступна только администраторам.',
            goBack: 'Вернуться назад',
            enterWinrate: 'Введите новый винрейт (от 0 до 100):',
            winrateChanged: 'Винрейт изменен на',
            invalidWinrate: 'Некорректное значение. Введите число от 0 до 100.',
            enterDelay: 'Введите новую задержку (в миллисекундах):',
            delayChanged: 'Задержка изменена на',
            invalidDelay: 'Некорректное значение. Минимум 100ms.',
            actionCompleted: 'Действие "{actionName}" выполнено',
            panelTitle: 'Панель Управления',
            panelSubtitle: 'Только для администраторов',
            globalSettings: 'Глобальные настройки',
            botWinrate: 'Винрейт бота',
            mockDelay: 'Мнимая задержка',
            userManagement: 'Управление пользователями',
            massMailingSent: 'Массовая рассылка отправлена',
            massMailing: 'Массовая рассылка',
            dbManagement: 'Управление базой'
        },
        userManagement: {
            users: 'Пользователи',
            searchPlaceholder: 'Поиск по имени или ID...',
            reg: 'Рег:',
            notFound: 'Пользователи не найдены.',
            balanceTitle: 'Баланс',
            userActions: 'Действия с пользователем',
            changeBalance: 'Изменить баланс',
            unbanUser: 'Разблокировать пользователя',
            banUser: 'Заблокировать пользователя',
            bannedStatus: 'Banned',
            enterBalance: 'Введите новый баланс для',
            balanceUpdated: 'Баланс пользователя ${name} обновлен до',
            invalidBalance: 'Некорректное значение баланса.',
            userActionSuccess: 'Пользователь ${name} успешно',
            unbannedAct: 'разбанен',
            bannedAct: 'забанен'
        }
    },
    en: {
        nav: {
            home: 'Home',
            wallet: 'Wallet',
            referrals: 'Referrals',
            stats: 'Stats',
            settings: 'Settings'
        },
        auth: {
            enterPin: 'Enter PIN',
            enterPinDesc: 'Enter PIN to sign in to the app.',
            pinPlaceholder: 'PIN code',
            login: 'Sign In',
            wrongPin: 'Wrong PIN code',
            networkError: 'Network error. Please try again.'
        },
        settings: {
            account: 'Account',
            userId: 'USER ID',
            changePin: 'Change PIN',
            botMode: 'Bot Mode',
            safeMode: 'Safe',
            safeModeDesc: 'Lower risk, smaller positions',
            balancedMode: 'Balanced',
            balancedModeDesc: 'Moderate risk and return',
            aggressiveMode: 'High Profit',
            aggressiveModeDesc: 'Higher risk, higher potential return',
            language: 'Language',
            dangerZone: 'Danger Zone',
            resetDesc: 'Reset balance to initial amount (clears trade history).',
            resetBtn: 'Reset balance to $0',
            logout: 'Log Out',
            adminPanel: 'Admin Panel',
            resetConfirm: 'Are you sure you want to reset the balance to $0? This will clear operation history.',
            logoutConfirm: 'Are you sure you want to log out?',
            resetSuccess: 'Balance successfully reset'
        },
        home: {
            title: 'You are successfully authorized!',
            balance: 'BALANCE',
            todayProfit: 'Today\'s Profit',
            winrate: 'Winrate',
            executions: 'Trades',
            latency: 'Ping',
            recentTrades: 'RECENT TRADES',
            profit: 'Profit',
            loss: 'Loss',
            noTrades: 'No trades yet',
            tradesLive: 'Trades',
            time: 'Time',
            pair: 'Pair',
            pnl: 'P&L',
            speed: 'Speed',
            delay: 'Latency',
            ns: 'ns',
            execSub: 'Exec. under 1 μs',
            executionsTitle: 'Executions',
            perSession: 'Per session',
            avgSpeed: 'Avg Execution Speed'
        },
        wallet: {
            availableBalance: 'Available Balance',
            expectedDaily: 'Expected daily from trades:',
            deposit: 'Deposit',
            withdraw: 'Withdraw',
            networkBalances: 'Network Balances',
            dailyProfit: 'Daily Profit',
            dailyProfitDesc: 'Around 5% daily from trading (depends on market).',
            withdrawLimits: 'Withdrawal Limits',
            txHistory: 'Transaction History',
            noTx: 'No operations yet. Use "Deposit" or "Withdraw" above.'
        },
        referral: {
            title: 'Your referral link',
            subtitle: 'Share it to start earning',
            yourCode: 'Your code:',
            invited: 'Invited',
            clickedLink: 'Clicked the link',
            earned: 'Earned',
            fromDeposits: '5% from deposits',
            howItWorks: 'How it works:',
            howItWorksDesc: 'Share the link. When a person registers and tops up the balance — you will automatically receive 5% of the amount in USDT.'
        },
        stats: {
            title: 'Statistics',
            subtitle: 'Profit for day, week and month',
            pnlPeriods: 'Profit and loss by period',
            pnlToday: 'P&L Today',
            tradesToday: 'trades today',
            pnlWeek: 'P&L for week',
            for7Days: 'For 7 days ·',
            tradesText: 'trades',
            pnlMonth: 'P&L for month',
            for30Days: 'For 30 days ·',
            performance: 'Performance',
            winrate: 'Winrate',
            profitableOf: 'profitable /',
            totalFixed: 'total'
        },
        deposit: {
            title: 'Deposit',
            selectNetwork: 'Select Network',
            scanToDeposit: 'Scan to deposit',
            depositAddress: 'DEPOSIT ADDRESS',
            copy: 'Copy',
            warning1: 'Send only',
            warning2: 'to this address. Other assets may be lost.'
        },
        withdraw: {
            title: 'Withdraw',
            invalidAmount: 'Enter a valid amount',
            invalidAddress: 'Enter wallet address',
            success: 'Withdrawal request successfully created',
            error: 'Withdrawal error',
            networkError: 'Network error occurred',
            selectNetwork: 'Select Network',
            amountUsd: 'Amount (USD)',
            available: 'Available:',
            max: 'Max',
            minMaxDaily: 'Min ${min} · max ${max} per day',
            remainingToday: 'Remaining today:',
            walletAddress: 'Wallet address',
            cancel: 'Cancel',
            withdrawBtn: 'Withdraw',
            addressPlaceholder: 'Address...'
        },
        admin: {
            accessDenied: 'Access Denied',
            adminsOnly: 'This page is only available to administrators.',
            goBack: 'Go back',
            enterWinrate: 'Enter new winrate (0 to 100):',
            winrateChanged: 'Winrate changed to',
            invalidWinrate: 'Invalid value. Enter a number from 0 to 100.',
            enterDelay: 'Enter new delay (in milliseconds):',
            delayChanged: 'Delay changed to',
            invalidDelay: 'Invalid value. Minimum 100ms.',
            actionCompleted: 'Action "{actionName}" completed',
            panelTitle: 'Control Panel',
            panelSubtitle: 'For administrators only',
            globalSettings: 'Global settings',
            botWinrate: 'Bot winrate',
            mockDelay: 'Mock delay',
            userManagement: 'User management',
            massMailingSent: 'Mass mailing sent',
            massMailing: 'Mass mailing',
            dbManagement: 'Database management'
        },
        userManagement: {
            users: 'Users',
            searchPlaceholder: 'Search by name or ID...',
            reg: 'Reg:',
            notFound: 'Users not found.',
            balanceTitle: 'Balance',
            userActions: 'User Actions',
            changeBalance: 'Change balance',
            unbanUser: 'Unban user',
            banUser: 'Ban user',
            bannedStatus: 'Banned',
            enterBalance: 'Enter new balance for',
            balanceUpdated: 'User ${name}\'s balance updated to',
            invalidBalance: 'Invalid balance value.',
            userActionSuccess: 'User ${name} successfully',
            unbannedAct: 'unbanned',
            bannedAct: 'banned'
        }
    }
};

export function useTranslation() {
    const { language } = useUserStore();

    const t = (path: string): string => {
        const keys = path.split('.');
        let current: any = translations[language];

        for (const key of keys) {
            if (current[key] === undefined) {
                return path; // fallback to path if missing
            }
            current = current[key];
        }

        return current as string;
    };

    return { t, language };
}
