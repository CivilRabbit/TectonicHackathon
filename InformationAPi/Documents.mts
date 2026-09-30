abstract class Imformation{

    constructor(private name: string, private url: string) {
        
    }
    public getName() : string{
        return this.name;
    }

    public getLink() : string {
        return this.url;
    }
}

class PDFDocument extends Imformation{

}

class TeamsChat extends Imformation{

}

