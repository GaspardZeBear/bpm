class Konsol {

    // All these thinggs dont work
    static stack = []
    static promises = []

    static log(...msg) {
        const ddate = new Date().toISOString()
        const evt = ddate + ' ' + msg.join(' ')
        Konsol.stack.push(evt)
        console.log(`Konsol.log() pushed ${evt} `)
    }

    static getStack() {
        return Konsol.stack
    }

    constructor(url, timeout) {
        this.url = url
        this.timeout = timeout
    }

    //------------------------------------------------------------------------
    httpLog(tmstp, correlationId, type, msg) {
        const HTTP_TIMEOUT = 1000;
        if (tmstp === null) {
            tmstp=Date.now()
        }
        const url = 'http://localhost:1961/log';
        (async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT);
            try {
                fetch(url, {
                    method: "POST",
                    body: JSON.stringify({
                        tmstp: tmstp,
                        t: correlationId,
                        msg: msg,
                        type: type,
                    }),
                    headers: {
                        "Content-type": "application/json; charset=UTF-8",
                    }
                })
                    .catch((err) => { })
                //    .then((response) => { })
                //    .then((json) => console.log(json));
            } catch (error) {
                //console.error(error);
            } finally {
                clearTimeout(timeoutId);
            }
        })();
    }
}
export { Konsol };